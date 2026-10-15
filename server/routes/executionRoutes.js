import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { executionRateLimiter } from '../middleware/rateLimiter.js';
import {
  getUserExecutions,
  getUserExecutionStats,
  getExecutionById,
  rerunExecution,
  deleteExecution,
  purgeFailedExecutions
} from '../controllers/executionController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getUserExecutions);
router.get('/stats', getUserExecutionStats);
router.post('/purge-failed', purgeFailedExecutions);
router.delete('/purge-failed', purgeFailedExecutions);
router.get('/:id', getExecutionById);
router.post('/:id/rerun', executionRateLimiter, rerunExecution);
router.delete('/:id', deleteExecution);

export default router;

