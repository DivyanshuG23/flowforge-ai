import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/auth/me
 * @desc    Get authenticated user information from verified JWT
 * @access  Private
 */
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      role: req.user.role
    },
    userId: req.user.id,
    role: req.user.role
  });
});

export default router;
