import { Response } from 'express';

export function sendSuccess(res: Response, data: any, statusCode: number = 200) {
  const requestId = res.req?.requestId || '';
  return res.status(statusCode).json({
    success: true,
    data,
    requestId,
  });
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details: any[] = []
) {
  const requestId = res.req?.requestId || '';
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    requestId,
  });
}

export function sendValidationError(res: Response, details: any[]) {
  return sendError(res, 'VALIDATION_ERROR', 'Request validation failed.', 422, details);
}

export function sendUnauthorized(res: Response, message?: string) {
  return sendError(res, 'UNAUTHORIZED', message || 'Access token is missing or invalid.', 401);
}

export function sendForbidden(res: Response) {
  return sendError(res, 'FORBIDDEN', 'You do not have permission to perform this action.', 403);
}

export function sendNotFound(res: Response, resource: string = 'Resource') {
  return sendError(res, 'RESOURCE_NOT_FOUND', `${resource} not found.`, 404);
}

export function sendConflict(res: Response, code: string, message: string) {
  return sendError(res, code, message, 409);
}
