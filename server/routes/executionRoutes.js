import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getUserExecutions,
  getUserExecutionStats,
  getExecutionById
} from '../controllers/executionController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getUserExecutions);
router.get('/stats', getUserExecutionStats);
router.get('/:id', getExecutionById);

export default router;

