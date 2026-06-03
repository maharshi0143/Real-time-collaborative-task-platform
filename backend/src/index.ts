import { httpServer } from './app';
import { config } from './config';
import { prisma } from './utils/prisma';
import { redis } from './utils/redis';
import { logger } from './utils/logger';
import { WebSocketService } from './services/websocket.service';
import { setWebSocketGauge } from './utils/metrics';
import cron from 'node-cron';
import { dueSoonNotifier } from './jobs/dueSoonNotifier';
import { overdueNotifier } from './jobs/overdueNotifier';

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info({ message: 'Database connected' });

    await redis.connect();
    logger.info({ message: 'Redis connected' });

    const wsService = new WebSocketService(httpServer);
    setWebSocketGauge(wsService);

    cron.schedule('0 * * * *', () => {
      dueSoonNotifier();
      overdueNotifier();
    });

    httpServer.listen(config.port, () => {
      logger.info({ message: `Server running on port ${config.port}`, environment: config.nodeEnv });
    });
  } catch (err: any) {
    logger.error({ message: 'Failed to start server', error: err.message });
    process.exit(1);
  }
}

bootstrap();
