import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'task-platform-backend' },
  transports: [
    new winston.transports.Console({
      format: logFormat,
    }),
  ],
});

export function createRequestLogger(req: any, res: any, durationMs: number) {
  const logData: any = {
    timestamp: new Date().toISOString(),
    level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    requestId: req.requestId,
    userId: req.user?.id || null,
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode: res.statusCode,
    durationMs,
    message: 'Request completed',
  };
  logger.log(logData);
}
