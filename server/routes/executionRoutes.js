import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getExecutionById } from '../controllers/executionController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/:id', getExecutionById);

export default router;
