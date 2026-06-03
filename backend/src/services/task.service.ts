import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import { publishUserNotification } from './notification.service';

export class TaskService {
  async create(boardId: string, data: {
    title: string;
    description?: string | null;
    assigneeId?: string | null;
    priority?: string;
    dueDate?: string | null;
    tags?: string[];
    createdBy: string;
  }) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { project: { include: { workspace: true } } },
    });
    if (!board) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Board not found.' };

    if (data.assigneeId) {
      const isMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: board.project.workspaceId,
            userId: data.assigneeId,
          },
        },
      });
      if (!isMember) {
        throw {
          statusCode: 422,
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: [{ field: 'assigneeId', message: 'Assignee must be a member of this workspace.' }],
        };
      }
    }

    if (data.dueDate) {
      const due = new Date(data.dueDate);
      if (due <= new Date()) {
        throw {
          statusCode: 422,
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: [{ field: 'dueDate', message: 'Due date must be in the future.' }],
        };
      }
    }

    const lastTask = await prisma.task.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });
    const position = lastTask ? lastTask.position + 65536.0 : 65536.0;

    const task = await prisma.task.create({
      data: {
        boardId,
        title: data.title,
        description: data.description || null,
        assigneeId: data.assigneeId || null,
        createdBy: data.createdBy,
        priority: data.priority || 'medium',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        position,
        tags: data.tags || [],
      },
      include: {
        assignee: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
        creator: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: board.project.workspaceId,
        projectId: board.project.id,
        taskId: task.id,
        actorId: data.createdBy,
        action: 'task.created',
        metadata: { taskTitle: task.title, boardId, priority: task.priority },
      },
    });

    if (data.assigneeId) {
      const notification = await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: 'task_assigned',
          title: 'You have been assigned a new task',
          body: `${task.creator?.username || 'Someone'} assigned you: "${task.title}"`,
          link: `/workspaces/${board.project.workspace.slug}/projects/${board.project.id}/boards/${boardId}`,
        },
      });

      await publishUserNotification(data.assigneeId, notification);
    }

    await this.publishBoardEvent(boardId, 'task:created', {
      task: {
        id: task.id,
        boardId: task.boardId,
        title: task.title,
        description: task.description,
        assignee: task.assignee,
        createdBy: task.creator,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        tags: task.tags,
        position: task.position,
        commentCount: task._count.comments,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    });

    return {
      id: task.id,
      boardId: task.boardId,
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      createdBy: task.creator,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      tags: task.tags,
      position: task.position,
      commentCount: task._count.comments,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async getById(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
        creator: { select: { id: true, username: true, avatarUrl: true } },
        board: { select: { id: true, name: true, projectId: true } },
        _count: { select: { comments: true } },
      },
    });
    if (!task) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Task not found.' };
    return task;
  }

  async list(boardId: string, filters: {
    page?: number;
    limit?: number;
    assigneeId?: string;
    priority?: string;
    status?: string;
    tags?: string;
    dueBefore?: string;
    dueAfter?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { boardId };

    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.priority) where.priority = filters.priority;
    if (filters.status) where.status = filters.status;
    if (filters.tags) {
      const tagList = filters.tags.split(',').map((t) => t.trim());
      where.tags = { hasSome: tagList };
    }
    if (filters.dueBefore) where.dueDate = { ...where.dueDate, lte: new Date(filters.dueBefore) };
    if (filters.dueAfter) where.dueDate = { ...where.dueDate, gte: new Date(filters.dueAfter) };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const allowedSortFields = ['position', 'created_at', 'due_date', 'priority'];
    const sortField = filters.sortBy || 'position';
    const sortOrder = filters.sortOrder === 'desc' ? 'desc' : 'asc';

    let orderBy: any;
    if (sortField === 'created_at') orderBy = { createdAt: sortOrder };
    else if (sortField === 'due_date') orderBy = { dueDate: sortOrder };
    else if (sortField === 'priority') {
      orderBy = { priority: sortOrder };
    } else {
      orderBy = { position: sortOrder };
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          assignee: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        boardId: t.boardId,
        title: t.title,
        priority: t.priority,
        status: t.status,
        assignee: t.assignee,
        dueDate: t.dueDate,
        tags: t.tags,
        position: t.position,
        commentCount: t._count.comments,
        createdAt: t.createdAt,
      })),
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

  async update(taskId: string, data: any, userId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { board: { include: { project: { include: { workspace: true } } } } },
    });
    if (!task) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Task not found.' };

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.tags !== undefined) updateData.tags = data.tags;

    let assigneeChanged = false;
    if (data.assigneeId !== undefined) {
      if (data.assigneeId) {
        const isMember = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: task.board.project.workspaceId,
              userId: data.assigneeId,
            },
          },
        });
        if (!isMember) {
          throw {
            statusCode: 422,
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed.',
            details: [{ field: 'assigneeId', message: 'Assignee must be a member of this workspace.' }],
          };
        }
      }
      updateData.assigneeId = data.assigneeId;
      assigneeChanged = task.assigneeId !== data.assigneeId;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
        creator: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    });

    if (data.title !== undefined || data.description !== undefined || data.priority !== undefined || data.dueDate !== undefined || data.tags !== undefined) {
      await prisma.activityLog.create({
        data: {
          workspaceId: task.board.project.workspaceId,
          projectId: task.board.project.id,
          taskId,
          actorId: userId,
          action: 'task.updated',
          metadata: { updatedFields: Object.keys(updateData).filter((k) => k !== 'assigneeId') },
        },
      });
    }

    if (assigneeChanged) {
      await prisma.activityLog.create({
        data: {
          workspaceId: task.board.project.workspaceId,
          projectId: task.board.project.id,
          taskId,
          actorId: userId,
          action: 'task.assigned',
          metadata: { oldAssigneeId: task.assigneeId, newAssigneeId: data.assigneeId },
        },
      });

      if (data.assigneeId) {
        const notification = await prisma.notification.create({
          data: {
            userId: data.assigneeId,
            type: 'task_assigned',
            title: 'You have been assigned a new task',
            body: `You were assigned: "${updated.title}"`,
            link: `/workspaces/${task.board.project.workspace.slug}/projects/${task.board.project.id}/boards/${task.boardId}`,
          },
        });

        await publishUserNotification(data.assigneeId, notification);
      }

      if (!data.assigneeId && task.assigneeId) {
        const unassignNotification = await prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'task_unassigned',
            title: 'Task unassigned',
            body: `You were unassigned from: "${updated.title}"`,
          },
        });

        await publishUserNotification(task.assigneeId, unassignNotification);
      }
    }

    await this.publishBoardEvent(task.boardId, 'task:updated', {
      task: {
        id: updated.id,
        boardId: updated.boardId,
        title: updated.title,
        description: updated.description,
        assignee: updated.assignee,
        createdBy: updated.creator,
        priority: updated.priority,
        status: updated.status,
        dueDate: updated.dueDate,
        tags: updated.tags,
        position: updated.position,
        commentCount: updated._count.comments,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });

    return updated;
  }

  async move(taskId: string, targetBoardId: string, position: number, userId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: { include: { project: { include: { workspace: true } } } },
      },
    });
    if (!task) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Task not found.' };

    const targetBoard = await prisma.board.findUnique({
      where: { id: targetBoardId },
    });
    if (!targetBoard) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Target board not found.' };

    const fromBoardId = task.boardId;
    const fromStatus = task.status;

    const statusMap: Record<string, string> = {
      'To Do': 'todo',
      'In Progress': 'in_progress',
      'In Review': 'in_review',
      'Done': 'done',
    };
    const toStatus = statusMap[targetBoard.name] || 'todo';

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { boardId: targetBoardId, position, status: toStatus },
      include: {
        assignee: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { comments: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: task.board.project.workspaceId,
        projectId: task.board.project.id,
        taskId,
        actorId: userId,
        action: 'task.moved',
        metadata: {
          fromBoardId,
          toBoardId: targetBoardId,
          fromStatus,
          toStatus,
        },
      },
    });

    const eventPayload = {
      type: 'task:moved',
      taskId,
      fromBoardId,
      toBoardId: targetBoardId,
      position,
    };

    await this.publishBoardEvent(fromBoardId, 'task:moved', eventPayload);
    if (fromBoardId !== targetBoardId) {
      await this.publishBoardEvent(targetBoardId, 'task:moved', eventPayload);
    }

    return {
      id: updated.id,
      boardId: updated.boardId,
      position: updated.position,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  async delete(taskId: string, userId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { board: { include: { project: true } } },
    });
    if (!task) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Task not found.' };

    await prisma.task.delete({ where: { id: taskId } });

    await this.publishBoardEvent(task.boardId, 'task:deleted', { taskId, boardId: task.boardId });

    return task;
  }

  async addComment(taskId: string, content: string, authorId: string, parentId?: string | null) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: { include: { project: { include: { workspace: true } } } },
      },
    });
    if (!task) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Task not found.' };

    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.taskId !== taskId) {
        throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Parent comment not found.' };
      }
    }

    const comment = await prisma.comment.create({
      data: { taskId, authorId, content, parentId: parentId || null },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    });

    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: task.board.project.workspaceId,
        user: { username: { in: mentions } },
      },
      include: { user: { select: { id: true, username: true } } },
    });

    for (const member of workspaceMembers) {
      const n = await prisma.notification.create({
        data: {
          userId: member.user.id,
          type: 'mentioned',
          title: 'You were mentioned in a comment',
          body: `${comment.author?.username || 'Someone'} mentioned you on task: "${task.title}" — "${comment.content}"`,
          link: `/workspaces/${task.board.project.workspace.slug}/projects/${task.board.project.id}/boards/${task.boardId}?task=${taskId}`,
        },
      });

      await publishUserNotification(member.user.id, n);
    }

    await prisma.activityLog.create({
      data: {
        workspaceId: task.board.project.workspaceId,
        projectId: task.board.project.id,
        taskId,
        actorId: authorId,
        action: 'comment.added',
        metadata: { commentId: comment.id, mentions: workspaceMembers.map((m) => m.user.username) },
      },
    });

    await this.publishBoardEvent(task.boardId, 'comment:added', {
      taskId,
      comment: {
        id: comment.id,
        taskId: comment.taskId,
        content: comment.content,
        author: comment.author,
        parentId: comment.parentId,
        mentions: workspaceMembers.map((m) => m.user.username),
        createdAt: comment.createdAt,
      },
    });

    return {
      id: comment.id,
      taskId: comment.taskId,
      content: comment.content,
      author: comment.author,
      parentId: comment.parentId,
      mentions: workspaceMembers.map((m) => m.user.username),
      createdAt: comment.createdAt,
    };
  }

  async listComments(taskId: string) {
    return prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateComment(commentId: string, content: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: { board: { include: { project: { include: { workspace: true } } } } },
        },
      },
    });
    if (!comment) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Comment not found.' };

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: comment.task.board.project.workspaceId,
        projectId: comment.task.board.project.id,
        taskId: comment.taskId,
        actorId: userId,
        action: 'comment.edited',
        metadata: { commentId },
      },
    });

    return updated;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: { board: { include: { project: { include: { workspace: true } } } } },
        },
      },
    });
    if (!comment) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Comment not found.' };

    await prisma.comment.delete({ where: { id: commentId } });

    await prisma.activityLog.create({
      data: {
        workspaceId: comment.task.board.project.workspaceId,
        projectId: comment.task.board.project.id,
        taskId: comment.taskId,
        actorId: userId,
        action: 'comment.deleted',
        metadata: { commentId },
      },
    });
  }

  async getActivity(taskId: string) {
    return prisma.activityLog.findMany({
      where: { taskId },
      include: { actor: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async publishBoardEvent(boardId: string, type: string, data: any) {
    try {
      await redis.publish(`board:${boardId}:events`, JSON.stringify({ type, ...data }));
    } catch {
      logger.warn({ message: 'Redis publish failed for board event', boardId, type });
    }
  }
}

export const taskService = new TaskService();
