import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  logger.error({ message: 'Redis connection error', error: err.message });
});

redis.on('connect', () => {
  logger.info({ message: 'Redis connected' });
});

export async function checkRedis(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    logger.warn({ message: 'Redis ping failed' });
    return false;
  }
}
