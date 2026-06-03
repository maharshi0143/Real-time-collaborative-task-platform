import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { publishUserNotification } from '../services/notification.service';

export async function overdueNotifier() {
  try {
    const now = new Date();

    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['done', 'cancelled'] },
        assigneeId: { not: null },
      },
      include: {
        assignee: { select: { id: true } },
      },
    });

    for (const task of tasks) {
      if (!task.assigneeId) continue;

      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          type: 'task_overdue',
          title: { contains: task.title },
        },
      });

      if (!existingNotification) {
        const notification = await prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'task_overdue',
            title: 'Task overdue',
            body: `"${task.title}" was due on ${task.dueDate?.toISOString().split('T')[0]}.`,
            link: `/tasks/${task.id}`,
          },
        });

        await publishUserNotification(task.assigneeId, notification);
      }
    }

    if (tasks.length > 0) {
      logger.info({ message: `Overdue notifier: ${tasks.length} notifications created` });
    }
  } catch (err: any) {
    logger.error({ message: 'Overdue notifier failed', error: err.message });
  }
}
