import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { executionRateLimiter, webhookRateLimiter } from '../middleware/rateLimiter.js';
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  getWorkflowTriggers,
  updateWorkflowSchedule,
  updateWorkflowWebhook,
  getWorkflowTemplates,
  createWorkflowFromTemplate
} from '../controllers/workflowController.js';
import {
  executeWorkflow,
  getWorkflowExecutions
} from '../controllers/executionController.js';
import { handleWebhookTrigger } from '../controllers/webhookController.js';

const router = express.Router();

// Public Webhook trigger endpoint (does NOT require JWT, validated via unguessable token and secret)
router.post('/webhook/:token', webhookRateLimiter, handleWebhookTrigger);

// Enforce JWT authentication on all authenticated workflow management endpoints
router.use(authMiddleware);

router.route('/')
  .post(createWorkflow)
  .get(getWorkflows);

// Workflow Templates & Blueprints (must be registered before /:id)
router.get('/templates', getWorkflowTemplates);
router.post('/from-template', createWorkflowFromTemplate);
router.post('/from-template/:templateId', createWorkflowFromTemplate);

router.route('/:id')
  .get(getWorkflowById)
  .put(updateWorkflow)
  .delete(deleteWorkflow);

// Trigger Configuration Endpoints
router.get('/:id/triggers', getWorkflowTriggers);
router.put('/:id/schedule', updateWorkflowSchedule);
router.put('/:id/webhook', updateWorkflowWebhook);

// Duplicate workflow
router.post('/:id/duplicate', duplicateWorkflow);

// Execute workflow (rate limited per authenticated user)
router.post('/:id/execute', executionRateLimiter, executeWorkflow);
router.get('/:id/executions', getWorkflowExecutions);

export default router;

