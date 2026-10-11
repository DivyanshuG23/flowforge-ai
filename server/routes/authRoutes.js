import express from 'express';
import { register, login } from '../controllers/authController.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/auth/register (rate limited)
router.post('/register', authRateLimiter, register);

// POST /api/auth/login (rate limited)
router.post('/login', authRateLimiter, login);

export default router;
