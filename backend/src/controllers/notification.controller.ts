import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { z } from 'zod';

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1, 'At least one notification ID is required.'),
});

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { isRead, page, limit } = req.query as any;
      const data = await notificationService.list(
        req.user!.id,
        isRead,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 20
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = markReadSchema.safeParse(req.body);
      if (!result.success) {
        return sendSuccess(res, { updatedCount: 0 });
      }

      const data = await notificationService.markAsRead(req.user!.id, result.data.notificationIds);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.delete(req.user!.id, req.params.notificationId);
      return sendSuccess(res, { message: 'Notification deleted.' });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
