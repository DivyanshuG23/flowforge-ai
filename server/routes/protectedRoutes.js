import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getProfile, updateProfile } from '../controllers/authController.js';

const router = express.Router();

/**
 * @route   GET /api/auth/me
 * @desc    Get authenticated user profile from database
 * @access  Private (JWT required)
 */
router.get('/me', authMiddleware, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update authenticated user profile (name, password)
 * @access  Private (JWT required)
 */
router.put('/profile', authMiddleware, updateProfile);

export default router;

