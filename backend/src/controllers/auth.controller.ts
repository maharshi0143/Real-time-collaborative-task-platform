import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { registerSchema, loginSchema, refreshSchema, updateProfileSchema } from '../validators/auth';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        const details = result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return sendValidationError(res, details);
      }

      const { user, tokens } = await authService.register(
        result.data.email,
        result.data.username,
        result.data.password,
        result.data.fullName
      );

      return sendSuccess(res, { user, tokens }, 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        const details = result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return sendValidationError(res, details);
      }

      try {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const rateKey = `rate_limit:login:${ip}`;
        const attempts = await redis.get(rateKey);
        if (attempts && parseInt(attempts) >= 10) {
          const ttl = await redis.ttl(rateKey);
          res.setHeader('Retry-After', Math.max(ttl, 1).toString());
          return sendError(res, 'RATE_LIMIT_EXCEEDED', 'Too many login attempts. Please try again later.', 429);
        }
        await redis.incr(rateKey);
        await redis.expire(rateKey, 900);
      } catch {
        logger.warn({ message: 'Redis unavailable — rate limiting skipped' });
      }

      const data = await authService.login(result.data.email, result.data.password);

      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const result = refreshSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const data = await authService.refresh(result.data.refreshToken);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      return sendSuccess(res, { message: 'Logged out successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.user!.id);
      return sendSuccess(res, { user });
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const user = await authService.updateProfile(req.user!.id, result.data);
      return sendSuccess(res, { user });
    } catch (err) {
      next(err);
    }
  }

  async health(_req: Request, res: Response) {
    return sendSuccess(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  }

  async ready(req: Request, res: Response) {
    const { prisma } = require('../utils/prisma');
    const { checkRedis } = require('../utils/redis');

    let dbStatus = 'ok';
    let redisStatus = 'ok';

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      logger.warn({ message: 'Health check — database ping failed' });
      dbStatus = 'error';
    }

    try {
      const ok = await checkRedis();
      if (!ok) redisStatus = 'error';
    } catch {
      logger.warn({ message: 'Health check — Redis ping failed' });
      redisStatus = 'error';
    }

    const allOk = dbStatus === 'ok' && redisStatus === 'ok';
    const status = allOk ? 'ready' : 'not_ready';
    return res.status(allOk ? 200 : 503).json({
      success: allOk,
      data: {
        status,
        checks: { database: dbStatus, redis: redisStatus },
      },
      requestId: req.requestId,
    });
  }
}

export const authController = new AuthController();
