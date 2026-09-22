import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/apiError';
import { sendError } from '../utils/apiResponse';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    sendError(res, 'Validation Error', 400, 'VALIDATION_ERROR', err.errors);
    return;
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    sendError(res, 'Duplicate key error', 409, 'DUPLICATE_KEY_ERROR', err.keyValue);
    return;
  }

  // Handle SyntaxError (malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'Invalid JSON payload provided', 400, 'INVALID_JSON');
    return;
  }

  // Fallback internal server error
  console.error('Unhandled Server Error:', err);
  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred'
      : err.message || 'Internal Server Error';

  sendError(
    res,
    message,
    500,
    'INTERNAL_SERVER_ERROR',
    env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
  );
};
