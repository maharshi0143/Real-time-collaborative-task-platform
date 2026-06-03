import { prisma } from '../utils/prisma';

export class AnalyticsService {
  async getSummary(workspaceId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const projectIds = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const projectIdList = projectIds.map((p) => p.id);

    const boardIds = await prisma.board.findMany({
      where: { projectId: { in: projectIdList } },
      select: { id: true },
    });
    const boardIdList = boardIds.map((b) => b.id);

    const tasksCreated = await prisma.task.count({
      where: {
        boardId: { in: boardIdList },
        createdAt: { gte: start, lte: end },
      },
    });

    const completionLogs = await prisma.activityLog.findMany({
      where: {
        action: 'task.moved',
        createdAt: { gte: start, lte: end },
        task: { boardId: { in: boardIdList } },
      },
      select: { taskId: true, createdAt: true, metadata: true },
    });

    const doneTaskIds = completionLogs
      .filter((log: any) => (log.metadata as any)?.toStatus === 'done')
      .map((log) => log.taskId);

    const uniqueDoneIds = [...new Set(doneTaskIds)].filter((id): id is string => id !== null);
    const totalTasksCompleted = uniqueDoneIds.length;

    const completionRate = tasksCreated > 0
      ? Math.round((totalTasksCompleted / tasksCreated) * 10000) / 100
      : 0;

    const creationLogs = await prisma.activityLog.findMany({
      where: {
        action: 'task.created',
        taskId: { in: uniqueDoneIds },
      },
      select: { taskId: true, createdAt: true },
    });

    const creationMap = new Map(creationLogs.map((l) => [l.taskId, l.createdAt]));
    const doneMap = new Map<string, Date>();
    for (const log of completionLogs) {
      const meta = log.metadata as any;
      if (meta?.toStatus === 'done' && !doneMap.has(log.taskId!)) {
        doneMap.set(log.taskId!, log.createdAt);
      }
    }

    let totalHours = 0;
    let hoursCount = 0;
    for (const taskId of uniqueDoneIds) {
      const created = creationMap.get(taskId);
      const done = doneMap.get(taskId);
      if (created && done) {
        const hours = (done.getTime() - created.getTime()) / (1000 * 3600);
        if (hours > 0) {
          totalHours += hours;
          hoursCount++;
        }
      }
    }
    const avgCompletionTimeHours = hoursCount > 0
      ? Math.round((totalHours / hoursCount) * 10) / 10
      : 0;

    const overdueTasksCount = await prisma.task.count({
      where: {
        boardId: { in: boardIdList },
        dueDate: { lt: new Date() },
        status: { notIn: ['done', 'cancelled'] },
      },
    });

    const activeMembers = await prisma.workspaceMember.count({
      where: { workspaceId },
    });

    const tasksByPriorityRaw = await prisma.task.groupBy({
      by: ['priority'],
      where: { boardId: { in: boardIdList } },
      _count: true,
    });
    const tasksByPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const item of tasksByPriorityRaw) {
      tasksByPriority[item.priority] = item._count;
    }

    const tasksByStatusRaw = await prisma.task.groupBy({
      by: ['status'],
      where: { boardId: { in: boardIdList } },
      _count: true,
    });
    const tasksByStatus: Record<string, number> = { todo: 0, in_progress: 0, in_review: 0, done: 0, cancelled: 0 };
    for (const item of tasksByStatusRaw) {
      tasksByStatus[item.status] = item._count;
    }

    const memberStats = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    const tasksByMember = [];
    for (const member of memberStats) {
      const assigned = await prisma.task.count({
        where: {
          boardId: { in: boardIdList },
          assigneeId: member.user.id,
        },
      });

      const memberDoneLogs = await prisma.activityLog.findMany({
        where: {
          action: 'task.moved',
          actorId: member.user.id,
          createdAt: { gte: start, lte: end },
          task: { boardId: { in: boardIdList } },
        },
        select: { taskId: true, createdAt: true, metadata: true },
      });

      const memberDoneIds = [...new Set(
        memberDoneLogs
          .filter((l: any) => (l.metadata as any)?.toStatus === 'done')
          .map((l) => l.taskId)
      )];

      tasksByMember.push({
        user: { id: member.user.id, username: member.user.username },
        assigned,
        completed: memberDoneIds.length,
        avgCompletionTimeHours: 0,
      });
    }

    const completionTrend = [];
    const current = new Date(start);
    while (current <= end) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const created = await prisma.task.count({
        where: {
          boardId: { in: boardIdList },
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const dayDoneLogs = await prisma.activityLog.findMany({
        where: {
          action: 'task.moved',
          createdAt: { gte: dayStart, lte: dayEnd },
          task: { boardId: { in: boardIdList } },
        },
        select: { metadata: true },
      });

      const completed = dayDoneLogs.filter((l: any) => (l.metadata as any)?.toStatus === 'done').length;

      completionTrend.push({
        date: dayStart.toISOString().split('T')[0],
        created,
        completed,
      });

      current.setDate(current.getDate() + 1);
    }

    return {
      period: { startDate, endDate },
      summary: {
        totalTasksCreated: tasksCreated,
        totalTasksCompleted,
        completionRate,
        avgCompletionTimeHours,
        overdueTasksCount,
        activeMembers,
      },
      tasksByPriority,
      tasksByStatus,
      tasksByMember,
      completionTrend,
    };
  }

  async getMemberAnalytics(workspaceId: string, userId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const projectIds = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const boardIds = await prisma.board.findMany({
      where: { projectId: { in: projectIds.map((p) => p.id) } },
      select: { id: true },
    });
    const boardIdList = boardIds.map((b) => b.id);

    const tasksAssigned = await prisma.task.findMany({
      where: {
        boardId: { in: boardIdList },
        assigneeId: userId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completedCount = await prisma.activityLog.count({
      where: {
        action: 'task.moved',
        actorId: userId,
        createdAt: { gte: start, lte: end },
        task: { boardId: { in: boardIdList } },
      },
    });

    return {
      tasksAssigned: tasksAssigned.length,
      tasksCompleted: completedCount,
      tasks: tasksAssigned.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        commentCount: t._count.comments,
        createdAt: t.createdAt,
      })),
    };
  }
}

export const analyticsService = new AnalyticsService();
