import { Request, Response, NextFunction } from 'express';
import { serviceSupabase } from '../db/supabase.js';

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

/**
 * Middleware to authenticate users using Supabase-issued tokens.
 * Validates the JWT from the Authorization header via Supabase Auth,
 * so auth.uid() works correctly and RLS policies apply natively.
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
    const {
      data: { user },
      error,
    } = await serviceSupabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please login again.',
      });
    }

    req.userId = user.id;
    req.user = {
      id: user.id,
      email: user.email ?? '',
      displayName: user.email ?? '',
    };

    next();
  } catch (error) {
    console.error('[authenticateUser] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Optional middleware for routes that can work with or without authentication.
 * If a valid Supabase token is provided, attaches user info; otherwise continues.
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user },
      error,
    } = await serviceSupabase.auth.getUser(token);

    if (!error && user) {
      req.userId = user.id;
      req.user = {
        id: user.id,
        email: user.email ?? '',
        displayName: user.email ?? '',
      };
    }

    next();
  } catch {
    // For optional auth, continue even if token is invalid
    next();
  }
};
