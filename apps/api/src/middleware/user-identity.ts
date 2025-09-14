import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Express Request type to include our custom properties
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
        displayName: string;
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  displayName: string;
}

/**
 * Middleware to authenticate users using JWT tokens
 * Validates the JWT from the Authorization header and attaches user info to the request
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[authenticateUser] JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Authentication service not configured',
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Attach user information to the request
    req.userId = decoded.userId;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      displayName: decoded.displayName,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token has expired. Please login again.',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please login again.',
      });
    }

    console.error('[authenticateUser] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Optional middleware for routes that can work with or without authentication
 * If a valid token is provided, it will attach user info; otherwise continues without auth
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // No auth header provided - continue without authentication
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[optionalAuth] JWT_SECRET not configured');
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    req.userId = decoded.userId;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      displayName: decoded.displayName,
    };

    next();
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    next();
  }
};
