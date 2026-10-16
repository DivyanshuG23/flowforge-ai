/**
 * Sanitizes telemetry error messages and payload data
 * Strips internal stack traces, system paths, environment secrets, and credentials
 */

export const sanitizeTelemetryError = (error) => {
  if (!error) return null;

  let raw = typeof error === 'string' ? error : (error.message || String(error));

  // Extract the first meaningful error sentence/line
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let primary = lines.find((l) => !l.startsWith('at ') && !l.startsWith('node:internal')) || lines[0] || 'Execution halted';

  // Strip system file paths
  primary = primary.replace(/(?:[A-Za-z]:\\[^:\s]+|(?:\/[a-zA-Z0-9_.-]+)+)/g, '[system path]');

  // Redact authorization tokens, API keys, and vendor prefixes
  primary = primary
    .replace(/(?:Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/AIza[0-9A-Za-z_-]{30,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/gsk_[0-9A-Za-z_-]{20,}/g, '[REDACTED_GROQ_KEY]')
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/(?:key|secret|apiKey|api_key|password|token|jwt|auth)[=:]\s*['"]?[A-Za-z0-9\-._~+/]{6,}['"]?/gi, (match) => {
      const prefix = match.split(/[=:]/)[0];
      return `${prefix}=[REDACTED]`;
    })
    .replace(/([?&](?:key|apiKey|api_key)=)[^&\s]+/gi, '$1[REDACTED]');

  return primary.trim();
};

/**
 * Sanitizes input/output objects for safe UI display
 */
export const sanitizeTelemetryData = (data) => {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;

  try {
    const seen = new WeakSet();
    const clean = (obj) => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);

      if (Array.isArray(obj)) {
        return obj.map(clean);
      }

      const res = {};
      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('key') ||
          lowerKey.includes('auth')
        ) {
          res[key] = '[REDACTED]';
        } else {
          res[key] = clean(obj[key]);
        }
      }
      return res;
    };

    return clean(data);
  } catch {
    return '[Sanitized Data]';
  }
};

/**
 * Strict client-side redaction of secrets, API keys, and bearer tokens
 */
export const sanitizeErrorText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/AIza[0-9A-Za-z_-]{30,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/gsk_[0-9A-Za-z_-]{20,}/g, '[REDACTED_GROQ_KEY]')
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/(?:key|secret|apiKey|api_key|token)[=:]\s*['"]?[A-Za-z0-9\-._~+/]{8,}['"]?/gi, (m) => {
      const prefix = m.split(/[=:]/)[0];
      return `${prefix}=[REDACTED]`;
    })
    .replace(/Bearer\s+[0-9A-Za-z_.\-]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:key|apiKey|api_key)=)[^&\s]+/gi, '$1[REDACTED]');
};

/**
 * Recursively scrubs all sensitive secrets, credentials, tokens, and API keys from an export payload
 */
export const deepSanitizeExportObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return sanitizeErrorText(obj);
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSanitizeExportObject);
  }
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('secret') || 
        lower.includes('apikey') || 
        lower.includes('api_key') || 
        lower.includes('authorization') || 
        lower.includes('password') ||
        lower.includes('token')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = deepSanitizeExportObject(val);
      }
    }
    return sanitized;
  }
  return obj;
};

/**
 * Reliably identifies Groq strictly from stored provider, model, or endpoint metadata.
 * Never relies on default provider fallbacks.
 */
export const isGroqMetadata = (step) => {
  if (!step) return false;
  const output = step.output || {};
  const input = step.input || {};
  const telemetry = output.telemetry || input.telemetry || (typeof input === 'object' && input.failoverLog ? input : null) || {};

  return Boolean(
    (typeof output.provider === 'string' && output.provider.toLowerCase() === 'groq') ||
    (typeof input.provider === 'string' && input.provider.toLowerCase() === 'groq') ||
    (typeof telemetry.provider === 'string' && telemetry.provider.toLowerCase() === 'groq') ||
    (typeof telemetry.finalProvider === 'string' && telemetry.finalProvider.toLowerCase() === 'groq') ||
    (typeof telemetry.primaryProvider === 'string' && telemetry.primaryProvider.toLowerCase() === 'groq') ||
    (typeof output.model === 'string' && (output.model.toLowerCase().includes('gpt-oss') || output.model.toLowerCase().startsWith('groq/'))) ||
    (typeof input.model === 'string' && (input.model.toLowerCase().includes('gpt-oss') || input.model.toLowerCase().startsWith('groq/'))) ||
    (typeof telemetry.finalModel === 'string' && (telemetry.finalModel.toLowerCase().includes('gpt-oss') || telemetry.finalModel.toLowerCase().startsWith('groq/'))) ||
    (typeof input.endpoint === 'string' && input.endpoint.toLowerCase().includes('groq.com')) ||
    (typeof output.endpoint === 'string' && output.endpoint.toLowerCase().includes('groq.com')) ||
    (typeof telemetry.endpoint === 'string' && telemetry.endpoint.toLowerCase().includes('groq.com'))
  );
};

/**
 * Resolves the AI execution viewer status mode and user-facing badge label based on telemetry.
 * Modes:
 * - 'primary_success': Primary provider succeeded on attempt 1
 * - 'failover_resolved': Fallback recovered after transient failure
 * - 'cascade_failed': All configured providers failed
 * - 'groq_direct': Direct LPU execution via Groq (single-provider, no failoverLog needed)
 * - 'failover_disabled': Single-provider mode with failover explicitly disabled
 * - 'legacy_record': Older execution without detailed telemetry
 */
export const resolveAiViewerMode = (step) => {
  if (!step) return { mode: 'legacy_record', label: 'Legacy Execution Record', failoverLog: null };

  const output = step.output || {};
  const input = step.input || {};
  const telemetry = output.telemetry || input.telemetry || (typeof input === 'object' && input.failoverLog ? input : null) || {};

  const failoverLog = Array.isArray(output.failoverLog)
    ? output.failoverLog
    : Array.isArray(input.failoverLog)
      ? input.failoverLog
      : Array.isArray(telemetry.failoverLog)
        ? telemetry.failoverLog
        : null;

  const isSuccess = step.status === 'succeeded';
  const hasFailoverLog = Array.isArray(failoverLog) && failoverLog.length > 0;
  const failoverTriggered = telemetry.failoverTriggered ?? (Array.isArray(failoverLog) && failoverLog.length > 1 && failoverLog.some((f, idx) => idx > 0 && f.success));
  const isGroq = isGroqMetadata(step);

  if (hasFailoverLog) {
    if (failoverLog.length === 1 && failoverLog[0].success) {
      return { mode: 'primary_success', label: 'Primary Succeeded (Fallback Not Needed)', failoverLog };
    } else if (failoverTriggered && isSuccess) {
      const recoveredProvider = failoverLog.find(f => f.success)?.provider || output.provider || 'AI Provider';
      const displayName = recoveredProvider.charAt(0).toUpperCase() + recoveredProvider.slice(1);
      return { mode: 'failover_resolved', label: `Failover Resolved via ${displayName}`, failoverLog };
    } else if (!isSuccess) {
      return { mode: 'cascade_failed', label: 'Cascade Exhausted (All Configured Providers Failed)', failoverLog };
    } else {
      return { mode: 'multi_attempt', label: 'Multi-Attempt', failoverLog };
    }
  } else if (isSuccess && isGroq) {
    return { mode: 'groq_direct', label: 'Direct LPU Execution (Groq)', failoverLog: null };
  } else if (input.enableFailover === false || output.enableFailover === false || telemetry.enableFailover === false) {
    return { mode: 'failover_disabled', label: 'Single-Provider Mode (Failover Disabled)', failoverLog: null };
  } else {
    return { mode: 'legacy_record', label: 'Legacy Execution Record', failoverLog: null };
  }
};
