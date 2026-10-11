import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Middleware
 * Validates Bearer token from Authorization header and attaches verified claims to req.user
 */
export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token || !token.trim()) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Malformed token.'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT secret not set.'
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    // Attach verified claims only (never trust body or params)
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or malformed token.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

export const protect = authMiddleware;
export default authMiddleware;
