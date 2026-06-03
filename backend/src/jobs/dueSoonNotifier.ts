import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { publishUserNotification } from '../services/notification.service';

export async function dueSoonNotifier() {
  try {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: now, lte: twentyFourHoursLater },
        status: { notIn: ['done', 'cancelled'] },
        assigneeId: { not: null },
      },
    });

    for (const task of tasks) {
      if (!task.assigneeId) continue;

      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          type: 'due_soon',
          title: { contains: task.title },
        },
      });

      if (!existingNotification) {
        const notification = await prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'due_soon',
            title: 'Task due soon',
            body: `"${task.title}" is due within 24 hours.`,
            link: `/tasks/${task.id}`,
          },
        });

        await publishUserNotification(task.assigneeId, notification);
      }
    }

    if (tasks.length > 0) {
      logger.info({ message: `Due-soon notifier: ${tasks.length} notifications created` });
    }
  } catch (err: any) {
    logger.error({ message: 'Due-soon notifier failed', error: err.message });
  }
}
