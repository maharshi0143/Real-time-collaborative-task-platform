import { Request, Response, NextFunction } from 'express';
import { createRequestLogger, logger } from '../utils/logger';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    try {
      const duration = Date.now() - start;
      createRequestLogger(req, res, duration);
    } catch {
      logger.warn({ message: 'Request logger failed', path: req.originalUrl || req.url });
    }
  });

  next();
}
