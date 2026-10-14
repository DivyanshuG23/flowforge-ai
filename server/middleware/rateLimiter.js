import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Authentication Rate Limiter
 * Protects login and registration routes against credential stuffing, brute-force, and registration spam.
 * In production, strictly enforces a low threshold (default 20 requests per 15 min).
 * In development/test, provides generous capacity (default 1000) so local automated test suites run unhindered.
 */
export const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || (process.env.NODE_ENV === 'production' ? 20 : 1000),
  standardHeaders: 'draft-7',
  legacyHeaders: true,
  skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_RATE_LIMIT !== 'true',
  handler: (req, res) => {
    // Log rate limit hit safely without logging credentials, passwords, or payload
    console.warn(`[RateLimit] Auth rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    });
  }
});

/**
 * Resolves the rate limit key for execution requests:
 * Prioritizes authenticated user ID; falls back to IPv4/IPv6-normalized client IP.
 */
export const executionKeyGenerator = (req) => {
  return req.user?.id ? `user_${req.user.id}` : ipKeyGenerator(req.ip || '127.0.0.1');
};

/**
 * Resolves the rate limit key for webhook requests:
 * Prioritizes webhook route token; falls back to IPv4/IPv6-normalized client IP.
 */
export const webhookKeyGenerator = (req) => {
  return req.params?.token ? `hook_${req.params.token}` : ipKeyGenerator(req.ip || '127.0.0.1');
};

/**
 * Workflow Execution Rate Limiter
 * Protects workflow execution against denial of service, resource saturation, and AI API quota exhaustion.
 * Keyed by authenticated user ID (with fallback to client IP normalized for IPv4 and IPv6).
 */
export const executionRateLimiter = rateLimit({
  windowMs: parseInt(process.env.EXECUTION_RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000, // 1 minute
  max: parseInt(process.env.EXECUTION_RATE_LIMIT_MAX, 10) || (process.env.NODE_ENV === 'production' ? 30 : 1000),
  standardHeaders: 'draft-7',
  legacyHeaders: true,
  skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_RATE_LIMIT !== 'true',
  keyGenerator: executionKeyGenerator,
  handler: (req, res) => {
    const identifier = req.user?.id ? `user: ${req.user.id}` : `IP: ${req.ip}`;
    console.warn(`[RateLimit] Execution rate limit exceeded for ${identifier} on workflow: ${req.params?.id || 'unknown'}`);
    res.status(429).json({
      success: false,
      message: 'Workflow execution rate limit exceeded. Please wait a moment before executing more workflows.'
    });
  }
});

/**
 * Webhook Trigger Rate Limiter
 * Protects public webhook ingestion endpoints against volumetric flooding and replay bursts.
 * Keyed by webhook token and client IP normalized for IPv4 and IPv6.
 */
export const webhookRateLimiter = rateLimit({
  windowMs: parseInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000, // 1 minute
  max: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX, 10) || (process.env.NODE_ENV === 'production' ? 60 : 1000),
  standardHeaders: 'draft-7',
  legacyHeaders: true,
  skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_RATE_LIMIT !== 'true',
  keyGenerator: webhookKeyGenerator,
  handler: (req, res) => {
    console.warn(`[RateLimit] Webhook rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Webhook rate limit exceeded. Maximum 60 requests per minute.'
    });
  }
});

/**
 * Resets rate limit keys for automated testing in non-production environments
 */
export const resetRateLimits = (ip) => {
  const targets = [ip, '127.0.0.1', '::1', '::ffff:127.0.0.1'].filter(Boolean);
  for (const t of targets) {
    try {
      const normalizedKey = ipKeyGenerator(t);
      authRateLimiter.resetKey?.(t);
      authRateLimiter.resetKey?.(normalizedKey);
      executionRateLimiter.resetKey?.(t);
      executionRateLimiter.resetKey?.(normalizedKey);
      executionRateLimiter.resetKey?.(`user_${t}`);
      webhookRateLimiter.resetKey?.(t);
      webhookRateLimiter.resetKey?.(normalizedKey);
    } catch {}
  }
};
