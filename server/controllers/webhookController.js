import crypto from 'crypto';
import Workflow from '../models/Workflow.js';
import Execution from '../models/Execution.js';
import User from '../models/User.js';
import { executeWorkflowPipeline } from '../services/workflow/executionEngine.js';

/**
 * Foundation Webhook Controller
 * Handles external HTTP events triggering workflows with cryptographic verification,
 * replay protection, rate limiting, and execution tracking.
 */

// In-memory cache for recent event IDs to prevent replay / duplicate executions (5-minute TTL)
const recentEventCache = new Map();
const EVENT_TTL_MS = 5 * 60 * 1000;

// Cleanup stale event IDs periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentEventCache.entries()) {
    if (now - timestamp > EVENT_TTL_MS) {
      recentEventCache.delete(key);
    }
  }
}, 60 * 1000).unref();

/**
 * Generate a cryptographically unguessable webhook token (48 hex chars)
 * @returns {string}
 */
export const generateWebhookToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
const safeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Check if a header name indicates sensitive credentials
 * @param {string} headerName
 * @returns {boolean}
 */
const isSensitiveHeader = (headerName = '') => {
  const lower = headerName.toLowerCase();
  return (
    lower.includes('secret') ||
    lower.includes('token') ||
    lower.includes('key') ||
    lower.includes('auth') ||
    lower.includes('pass') ||
    lower.includes('cookie') ||
    lower.includes('credential')
  );
};

/**
 * Sanitize headers for telemetry storage (exclude authorization / secret headers)
 * @param {Object} headers
 * @returns {Object}
 */
const sanitizeIncomingHeaders = (headers = {}) => {
  const clean = {};
  for (const [key, val] of Object.entries(headers)) {
    if (!isSensitiveHeader(key)) {
      clean[key] = typeof val === 'string' && val.length > 200 ? `${val.slice(0, 200)}...` : val;
    }
  }
  return clean;
};

/**
 * Recursively mask sensitive fields (password, secret, token, key) in payload telemetry
 * @param {any} obj
 * @param {number} depth
 * @returns {any}
 */
const maskSensitivePayloadFields = (obj, depth = 0) => {
  if (depth > 5 || !obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitivePayloadFields(item, depth + 1));
  }
  const clean = {};
  const sensitivePattern = /password|secret|token|apikey|api_key|auth|credential|private_key|privatekey/i;
  for (const [k, v] of Object.entries(obj)) {
    if (sensitivePattern.test(k)) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = maskSensitivePayloadFields(v, depth + 1);
    } else {
      clean[k] = v;
    }
  }
  return clean;
};

/**
 * Sanitize incoming payload to prevent storing raw secrets in telemetry
 * @param {any} payload
 * @returns {any}
 */
const sanitizeIncomingPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  try {
    const masked = maskSensitivePayloadFields(payload);
    const serialized = JSON.stringify(masked);
    // Limit stored trigger data size to 16KB
    if (serialized.length > 16384) {
      return { _truncated: true, preview: serialized.slice(0, 500) + '... (truncated)' };
    }
    return JSON.parse(serialized);
  } catch {
    return { _unserializable: true };
  }
};

/**
 * Handle incoming webhook trigger
 * @route   POST /api/workflows/webhook/:token
 * @route   POST /api/webhooks/:token
 * @access  Public (Token & optional Secret verified)
 */
export const handleWebhookTrigger = async (req, res) => {
  const { token } = req.params;

  // Strict token format verification
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{32,64}$/i.test(token.trim())) {
    return res.status(404).json({
      success: false,
      message: 'Webhook endpoint not found.'
    });
  }

  try {
    // 1. Find workflow by unguessable token
    const workflow = await Workflow.findOne({ 'webhook.token': token.trim() });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Webhook endpoint not found.'
      });
    }

    if (!workflow.webhook?.enabled) {
      return res.status(403).json({
        success: false,
        message: 'Webhook endpoint is disabled for this workflow.'
      });
    }

    // Verify owning user existence
    const ownerId = workflow.user || workflow.userId;
    if (ownerId) {
      try {
        const ownerExists = await User.exists({ _id: ownerId });
        if (!ownerExists) {
          return res.status(403).json({
            success: false,
            message: 'Webhook endpoint inactive: workflow owner account not found.'
          });
        }
      } catch (userErr) {
        console.warn('[Webhook] User existence verification error:', userErr.message);
      }
    }

    // 2. Validate payload size limit (max 64KB)
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const bodyLength = req.body ? Buffer.byteLength(JSON.stringify(req.body)) : 0;
    if (contentLength > 65536 || bodyLength > 65536) {
      return res.status(413).json({
        success: false,
        message: 'Webhook payload exceeds 64KB limit.'
      });
    }

    // 3. Secret verification if configured
    if (workflow.webhook.secret && workflow.webhook.secret.trim()) {
      let providedSecret =
        req.headers['x-flowforge-secret'] ||
        req.headers['x-webhook-secret'] ||
        req.headers['x-hub-signature'];

      if (!providedSecret && req.headers['authorization']) {
        const authHeader = req.headers['authorization'].trim();
        if (authHeader.startsWith('Bearer ')) {
          providedSecret = authHeader.slice(7).trim();
        }
      }

      if (!providedSecret || !safeCompare(providedSecret, workflow.webhook.secret.trim())) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or missing webhook signature/secret.'
        });
      }
    }

    // 4. Duplicate / replay detection (L1 in-memory + L2 database)
    const eventIdHeader = req.headers['x-event-id'] || req.headers['x-delivery-id'] || req.headers['x-request-id'];
    const eventId = (eventIdHeader && typeof eventIdHeader === 'string' ? eventIdHeader.trim() : null) || (req.body?.eventId ? String(req.body.eventId).trim() : null);
    const payloadHash = req.body && Object.keys(req.body).length > 0
      ? crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex')
      : null;

    let cacheKey = null;
    if (eventId) {
      cacheKey = `${workflow._id}:${eventId}`;
    } else if (payloadHash) {
      cacheKey = `${workflow._id}:${payloadHash}`;
    }

    // L1 fast in-memory check
    if (cacheKey && recentEventCache.has(cacheKey)) {
      return res.status(200).json({
        success: true,
        message: 'Event already processed (idempotent duplicate).',
        duplicate: true
      });
    }

    // L2 multi-instance / post-restart check in MongoDB
    if (eventId || payloadHash) {
      try {
        const fiveMinutesAgo = new Date(Date.now() - EVENT_TTL_MS);
        const queryConditions = [];
        if (eventId) queryConditions.push({ 'triggerData.eventId': eventId });
        if (payloadHash) queryConditions.push({ 'triggerData.payloadHash': payloadHash });

        const existingRun = await Execution.findOne({
          workflow: workflow._id,
          triggerSource: 'webhook',
          createdAt: { $gte: fiveMinutesAgo },
          $or: queryConditions
        });

        if (existingRun) {
          if (cacheKey) recentEventCache.set(cacheKey, Date.now());
          return res.status(200).json({
            success: true,
            message: 'Event already processed (idempotent duplicate).',
            duplicate: true,
            executionId: existingRun._id
          });
        }
      } catch (l2Err) {
        // Continue if L2 lookup encounters an error
      }
    }

    if (cacheKey) {
      recentEventCache.set(cacheKey, Date.now());
    }

    // 5. Ensure workflow has executable nodes
    if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Workflow has no nodes configured.'
      });
    }

    // 6. Execute pipeline with incoming webhook payload
    const executionResult = await executeWorkflowPipeline(workflow, {
      triggerSource: 'webhook',
      triggerPayload: req.body || {},
      metadata: {
        eventId: eventIdHeader || null,
        contentType: req.headers['content-type'] || 'application/json',
        triggeredAt: new Date().toISOString()
      }
    });

    // 7. Persist execution record
    const execution = await Execution.create({
      workflow: workflow._id,
      user: workflow.user || workflow.userId,
      status: executionResult.status,
      startedAt: new Date(Date.now() - executionResult.durationMs),
      completedAt: new Date(),
      durationMs: executionResult.durationMs,
      nodeExecutions: executionResult.nodeExecutions,
      triggerSource: 'webhook',
      triggerData: {
        payload: sanitizeIncomingPayload(req.body),
        headers: sanitizeIncomingHeaders(req.headers),
        eventId: eventId || null,
        payloadHash: payloadHash || null
      },
      error: executionResult.error || null
    });

    // 8. Update workflow webhook statistics
    workflow.webhook.lastTriggeredAt = new Date();
    workflow.webhook.totalTriggers = (workflow.webhook.totalTriggers || 0) + 1;
    if (typeof workflow.save === 'function') {
      await workflow.save();
    } else {
      await Workflow.findByIdAndUpdate(workflow._id, {
        'webhook.lastTriggeredAt': workflow.webhook.lastTriggeredAt,
        'webhook.totalTriggers': workflow.webhook.totalTriggers
      });
    }

    return res.status(200).json({
      success: executionResult.status === 'succeeded',
      message:
        executionResult.status === 'succeeded'
          ? 'Webhook processed and pipeline executed successfully.'
          : 'Webhook received but pipeline execution failed.',
      executionId: execution._id,
      status: executionResult.status,
      durationMs: executionResult.durationMs,
      duplicate: false
    });
  } catch (error) {
    console.error('[Webhook] Internal error processing webhook:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error processing webhook.'
    });
  }
};
