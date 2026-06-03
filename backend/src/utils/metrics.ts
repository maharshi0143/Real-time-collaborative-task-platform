import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { WebSocketService } from '../services/websocket.service';

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const activeWebSocketConnections = new client.Gauge({
  name: 'active_websocket_connections',
  help: 'Current WebSocket connections',
  registers: [register],
});

const tasksCreatedTotal = new client.Counter({
  name: 'tasks_created_total',
  help: 'Total tasks created',
  labelNames: ['workspace_id'] as const,
  registers: [register],
});

const tasksCompletedTotal = new client.Counter({
  name: 'tasks_completed_total',
  help: 'Total tasks completed',
  labelNames: ['workspace_id'] as const,
  registers: [register],
});

const dbQueryDurationSeconds = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

const notificationsSentTotal = new client.Counter({
  name: 'notifications_sent_total',
  help: 'Total notifications sent',
  labelNames: ['type'] as const,
  registers: [register],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const route = req.route?.path || req.path || '/';

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();

    httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method: req.method, route }, duration);
  });

  next();
}

export function metricsRoute(_req: Request, res: Response) {
  res.setHeader('Content-Type', register.contentType);
  register.metrics().then((data) => res.send(data));
}

export function setWebSocketGauge(wsService: WebSocketService) {
  setInterval(() => {
    activeWebSocketConnections.set(wsService.getActiveConnections());
  }, 5000);
}

export function incrementTasksCreated(workspaceId: string) {
  tasksCreatedTotal.inc({ workspace_id: workspaceId });
}

export function incrementTasksCompleted(workspaceId: string) {
  tasksCompletedTotal.inc({ workspace_id: workspaceId });
}

export function observeDbQuery(operation: string, durationMs: number) {
  dbQueryDurationSeconds.observe({ operation }, durationMs / 1000);
}

export function incrementNotificationsSent(type: string) {
  notificationsSentTotal.inc({ type });
}

export { register };
