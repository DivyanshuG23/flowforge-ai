import mongoose from 'mongoose';

/**
 * Liveness Probe Controller
 * Verifies the Node.js process is active and accepting HTTP traffic.
 * @route   GET /api/health/liveness
 * @access  Public
 */
export const getLivenessStatus = (req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
};

/**
 * Readiness Probe Controller
 * Verifies all downstream dependencies (MongoDB) are operational.
 * @route   GET /api/health/readiness
 * @access  Public
 */
export const getReadinessStatus = (req, res) => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const isConnected = mongoose.connection && mongoose.connection.readyState === 1;

  if (isConnected) {
    return res.status(200).json({
      success: true,
      status: 'healthy',
      database: 'connected',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  }

  return res.status(503).json({
    success: false,
    status: 'unhealthy',
    database: 'disconnected',
    message: 'Database service is unavailable.',
    timestamp: new Date().toISOString()
  });
};

/**
 * Primary Health Check Controller
 * Defaults to readiness probe. Supports ?type=liveness for container orchestrators.
 * @route   GET /api/health
 * @access  Public
 */
export const getHealthStatus = (req, res) => {
  if (req.query?.type === 'liveness') {
    return getLivenessStatus(req, res);
  }
  return getReadinessStatus(req, res);
};

/**
 * Resets rate limiter memory store (Only available in non-production environments)
 * @route   POST /api/health/reset-limits
 */
export const resetLimits = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Endpoint not available in production.' });
  }

  const { resetRateLimits } = await import('../middleware/rateLimiter.js');
  resetRateLimits(req.ip);

  return res.status(200).json({
    success: true,
    message: 'Rate limit stores reset successfully for test runner.'
  });
};

