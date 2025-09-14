/**
 * Centralized Error Handling Utilities
 *
 * Provides consistent error handling patterns across the API
 */

import { Response } from 'express';

export interface ApiError {
  success: false;
  error: string;
  details?: string;
  code?: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

/**
 * Standard error response structure
 */
export const createErrorResponse = (
  message: string,
  details?: string,
  code?: string
): ApiError => ({
  success: false,
  error: message,
  ...(details && { details }),
  ...(code && { code }),
});

/**
 * Standard success response structure
 */
export const createSuccessResponse = <T>(data: T, message?: string): ApiSuccess<T> => ({
  success: true,
  data,
  ...(message && { message }),
});

/**
 * Handle database errors consistently
 */
export const handleDatabaseError = (error: any, operation: string): ApiError => {
  console.error(`[DatabaseError] ${operation}:`, error);

  // Handle specific database error types
  if (error?.code === '23505') {
    return createErrorResponse(
      'Duplicate entry found',
      'The resource you are trying to create already exists',
      'DUPLICATE_ENTRY'
    );
  }

  if (error?.code === '23503') {
    return createErrorResponse(
      'Referenced resource not found',
      'The operation references a resource that does not exist',
      'FOREIGN_KEY_VIOLATION'
    );
  }

  if (error?.message?.includes('Row Level Security')) {
    return createErrorResponse(
      'Access denied',
      'You do not have permission to perform this operation',
      'ACCESS_DENIED'
    );
  }

  return createErrorResponse(
    `Database operation failed: ${operation}`,
    error?.message || 'Unknown database error',
    'DATABASE_ERROR'
  );
};

/**
 * Handle authentication errors
 */
export const handleAuthError = (message: string = 'Authentication required'): ApiError => {
  return createErrorResponse(message, undefined, 'AUTH_ERROR');
};

/**
 * Handle validation errors
 */
export const handleValidationError = (field: string, message: string): ApiError => {
  return createErrorResponse('Validation failed', `${field}: ${message}`, 'VALIDATION_ERROR');
};

/**
 * Handle not found errors
 */
export const handleNotFoundError = (resource: string = 'Resource'): ApiError => {
  return createErrorResponse(`${resource} not found`, undefined, 'NOT_FOUND');
};

/**
 * Send error response with appropriate HTTP status
 */
export const sendErrorResponse = (
  res: Response,
  error: ApiError | string,
  statusCode: number = 500
): void => {
  const errorResponse = typeof error === 'string' ? createErrorResponse(error) : error;

  // Map error codes to HTTP status codes
  const httpStatus = getHttpStatusFromError(errorResponse, statusCode);

  res.status(httpStatus).json(errorResponse);
};

/**
 * Send success response
 */
export const sendSuccessResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void => {
  res.status(statusCode).json(createSuccessResponse(data, message));
};

/**
 * Map error codes to appropriate HTTP status codes
 */
const getHttpStatusFromError = (error: ApiError, defaultStatus: number): number => {
  if (!error.code) return defaultStatus;

  switch (error.code) {
    case 'AUTH_ERROR':
      return 401;
    case 'ACCESS_DENIED':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION_ERROR':
      return 400;
    case 'DUPLICATE_ENTRY':
      return 409;
    case 'FOREIGN_KEY_VIOLATION':
      return 422;
    default:
      return defaultStatus;
  }
};

/**
 * Wrapper for async route handlers to catch errors
 */
export const asyncHandler =
  (fn: (req: any, res: Response, next: any) => Promise<void>) =>
  (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('[AsyncHandler] Unhandled error:', error);
      sendErrorResponse(res, handleDatabaseError(error, 'operation'));
    });
  };

/**
 * Middleware to ensure consistent error format
 */
export const errorMiddleware = (error: any, req: any, res: Response, next: any): void => {
  console.error('[ErrorMiddleware]:', error);

  if (res.headersSent) {
    return next(error);
  }

  const errorResponse = error.isApiError ? error : handleDatabaseError(error, 'middleware');

  sendErrorResponse(res, errorResponse);
};
