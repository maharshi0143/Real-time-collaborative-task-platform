import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId || 'unknown';
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = config.isProduction && statusCode === 500
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal server error';

  console.error(`[${requestId}] Unhandled exception:`, err.message, err.stack);

  logger.error({
    timestamp: new Date().toISOString(),
    level: 'error',
    requestId,
    message: 'Unhandled exception',
    errorName: err.name || 'Error',
    errorMessage: err.message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: err.details || [],
    },
    requestId,
  });
}
