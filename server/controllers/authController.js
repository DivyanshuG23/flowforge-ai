import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyGoogleIdToken } from '../services/googleAuthService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Validate email
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 6 characters long'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in database
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    // Return sanitized response (never expose password or password hash)
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate user and return token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email and password presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare provided password with stored bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured in environment variables');
    }

    // Generate JWT token containing only safe user information
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
      }
    );

    // Return clean JSON response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate or register a user via verified Google ID token
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleLogin = async (req, res, next) => {
  try {
    const rawToken = req.body?.idToken || req.body?.credential;
    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required'
      });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId || !googleClientId.trim()) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: GOOGLE_CLIENT_ID is not configured'
      });
    }

    // Verify Google ID token cryptographically
    // Derives verified claims only: googleId, email, name, avatar, emailVerified
    let verifiedPayload;
    try {
      verifiedPayload = await verifyGoogleIdToken(rawToken, googleClientId);
    } catch (verifyError) {
      const status = verifyError.statusCode || 401;
      return res.status(status).json({
        success: false,
        message: verifyError.message || 'Google token verification failed'
      });
    }

    const { googleId, email, name, avatar } = verifiedPayload;

    // Account resolution & safe linking:
    // 1. Check if user already exists by googleId
    let user = await User.findOne({ googleId });

    if (user) {
      // Existing Google user. Backfill avatar if currently absent
      if (!user.avatar && avatar) {
        user.avatar = avatar;
        await user.save();
      }
    } else {
      // 2. Check if an account already exists with this verified email
      const existingUserByEmail = await User.findOne({ email });

      if (existingUserByEmail) {
        // Safe linking:
        // payload.emailVerified is strictly true (asserted by verifier).
        // Check if existing account is already linked to a different Google ID:
        if (existingUserByEmail.googleId && existingUserByEmail.googleId !== googleId) {
          return res.status(409).json({
            success: false,
            message: 'An account with this email is already linked to a different Google account'
          });
        }

        // Link Google ID to existing account.
        // NEVER touch existing password hash (preserves existing password login).
        existingUserByEmail.googleId = googleId;
        if (!existingUserByEmail.avatar && avatar) {
          existingUserByEmail.avatar = avatar;
        }
        user = await existingUserByEmail.save();
      } else {
        // 3. New user registration via Google
        try {
          user = await User.create({
            name,
            email,
            googleId,
            authProvider: 'google',
            avatar: avatar || null
          });
        } catch (createErr) {
          // Handle concurrency race condition (duplicate key error E11000)
          if (createErr.code === 11000) {
            user = await User.findOne({
              $or: [{ googleId }, { email }]
            });
            if (!user) {
              throw createErr;
            }

            // Security Hardening (SEC-01): Re-validate identity match in race-recovery path
            if (user.googleId && user.googleId !== googleId) {
              return res.status(409).json({
                success: false,
                message: 'An account with this email is already linked to a different Google account'
              });
            }

            // If account was created locally during the race without googleId, link safely
            if (!user.googleId) {
              user.googleId = googleId;
              if (!user.avatar && avatar) {
                user.avatar = avatar;
              }
              await user.save();
            } else if (!user.avatar && avatar) {
              user.avatar = avatar;
              await user.save();
            }
          } else {
            throw createErr;
          }
        }
      }
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured in environment variables');
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        avatar: user.avatar || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (JWT required)
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or account removed.'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      userId: user._id,
      role: user.role
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user profile (name and/or password)
 * @route   PUT /api/auth/profile
 * @access  Private (JWT required)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or access denied.'
      });
    }

    // Name update
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty.'
        });
      }
      if (name.trim().length < 2 || name.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Name must be between 2 and 50 characters.'
        });
      }
      user.name = name.trim();
    }

    // Password change or initial password creation for OAuth users
    if (newPassword || currentPassword) {
      if (user.password) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Current password is required to set a new password.'
          });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: 'Current password is incorrect.'
          });
        }
        if (currentPassword === newPassword) {
          return res.status(400).json({
            success: false,
            message: 'New password must be different from current password.'
          });
        }
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // Role and privileged fields are never modified from client payload
    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

