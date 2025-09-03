import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService.js';

// Extend the Express Request type to include our custom property
declare global {
  namespace Express {
    export interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware to identify the user from the 'x-user-id' header,
 * upsert them to the database, and attach the userId to the request object.
 */
export const identifyUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'] as string | undefined;

  if (!userId) {
    // Depending on the app's requirements, you might want to allow anonymous access
    // or return an error here. For now, we'll proceed without a user.
    return next();
  }

  // Attach user ID to the request object for other middleware and routes
  req.userId = userId;

  // Ensure the user exists in the database
  const { error } = await UserService.upsertUser(userId);

  if (error) {
    // If the upsert fails, we might want to block the request
    // depending on the desired level of strictness.
    // For now, we will log the error and continue.
    console.error(`[identifyUser] Failed to upsert user ${userId}, but continuing request. Error: ${error.message}`);
  }

  next();
};
