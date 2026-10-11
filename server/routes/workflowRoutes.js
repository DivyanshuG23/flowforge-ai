import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { executionRateLimiter } from '../middleware/rateLimiter.js';
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow
} from '../controllers/workflowController.js';
import {
  executeWorkflow,
  getWorkflowExecutions
} from '../controllers/executionController.js';

const router = express.Router();

// Enforce JWT authentication on all workflow endpoints
router.use(authMiddleware);

router.route('/')
  .post(createWorkflow)
  .get(getWorkflows);

router.route('/:id')
  .get(getWorkflowById)
  .put(updateWorkflow)
  .delete(deleteWorkflow);

// Execute workflow (rate limited per authenticated user)
router.post('/:id/execute', executionRateLimiter, executeWorkflow);
router.get('/:id/executions', getWorkflowExecutions);

export default router;
