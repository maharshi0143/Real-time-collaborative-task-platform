import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import { incrementNotificationsSent } from '../utils/metrics';

export async function publishUserNotification(userId: string, notification: any) {
  try {
    await redis.publish(
      `user:${userId}:events`,
      JSON.stringify({
        type: 'notification:new',
        userId,
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          link: notification.link,
          isRead: notification.isRead ?? false,
          createdAt: notification.createdAt || new Date().toISOString(),
        },
      })
    );

    incrementNotificationsSent(notification.type || 'unknown');
  } catch {
    logger.warn({ message: 'Redis publish failed for user notification', userId });
  }
}

export class NotificationService {
  async list(userId: string, isRead?: string, page: number = 1, limit: number = 20) {
    const where: any = { userId };
    if (isRead === 'true') where.isRead = true;
    else if (isRead === 'false') where.isRead = false;

    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async markAsRead(userId: string, notificationIds: string[]) {
    const ownNotifications = await prisma.notification.findMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      select: { id: true },
    });

    const ownIds = ownNotifications.map((n) => n.id);

    if (ownIds.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ownIds } },
        data: { isRead: true },
      });
    }

    return { updatedCount: ownIds.length };
  }

  async delete(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Notification not found.' };

    await prisma.notification.delete({ where: { id: notificationId } });
  }
}

export const notificationService = new NotificationService();
