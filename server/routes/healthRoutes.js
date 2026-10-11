import express from 'express';
import {
  getHealthStatus,
  getLivenessStatus,
  getReadinessStatus,
  resetLimits
} from '../controllers/healthController.js';

const router = express.Router();

// GET /api/health (Primary health & readiness check, supports ?type=liveness)
router.get('/', getHealthStatus);

// GET /api/health/liveness (Dedicated process liveness probe)
router.get('/liveness', getLivenessStatus);

// GET /api/health/readiness (Dedicated dependency readiness probe)
router.get('/readiness', getReadinessStatus);

// POST /api/health/reset-limits (Non-production test runner hook)
router.post('/reset-limits', resetLimits);

export default router;
