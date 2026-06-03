import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { requestIdMiddleware } from './middleware/requestId';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { globalErrorHandler } from './middleware/errorHandler';
import { metricsMiddleware, metricsRoute } from './utils/metrics';
import { authController } from './controllers/auth.controller';
import { logger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import projectRoutes from './routes/project.routes';
import boardRoutes from './routes/board.routes';
import taskRoutes from './routes/task.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(metricsMiddleware);

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/boards', boardRoutes);

app.get('/api/v1/health', authController.health.bind(authController));
app.get('/api/v1/ready', authController.ready.bind(authController));

app.use('/api/v1', taskRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.get('/metrics', metricsRoute);

app.use(globalErrorHandler);

export { app, httpServer };
