import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { sendForbidden, sendNotFound } from '../utils/response';

export function requireWorkspaceRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let workspaceId = req.params.workspaceId;
      if (!workspaceId) {
        return sendNotFound(res, 'Workspace');
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId);
      if (!isUuid) {
        const workspace = await prisma.workspace.findUnique({
          where: { slug: workspaceId },
          select: { id: true },
        });
        if (!workspace) return sendNotFound(res, 'Workspace');
        workspaceId = workspace.id;
        req.params.workspaceId = workspace.id;
      }

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership) {
        return sendForbidden(res);
      }

      if (!roles.includes(membership.role)) {
        return sendForbidden(res);
      }

      req.workspaceRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export async function checkBoardAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const boardId = req.params.boardId;
    if (!boardId) return next();

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        project: {
          include: { workspace: true },
        },
      },
    });

    if (!board) {
      return sendNotFound(res, 'Board');
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: board.project.workspaceId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      return sendForbidden(res);
    }

    req.workspaceRole = membership.role;
    req.workspaceId = board.project.workspaceId;
    next();
  } catch (err) {
    next(err);
  }
}

export async function checkProjectAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.projectId;
    if (!projectId) return next();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: true },
    });

    if (!project) {
      return sendNotFound(res, 'Project');
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      return sendForbidden(res);
    }

    req.workspaceRole = membership.role;
    req.workspaceId = project.workspaceId;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireProjectRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId;
      if (!projectId) {
        return sendNotFound(res, 'Project');
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { workspace: true },
      });

      if (!project) {
        return sendNotFound(res, 'Project');
      }

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: project.workspaceId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership || !roles.includes(membership.role)) {
        return sendForbidden(res);
      }

      req.workspaceRole = membership.role;
      req.workspaceId = project.workspaceId;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireBoardRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const boardId = req.params.boardId;
      if (!boardId) return sendNotFound(res, 'Board');

      const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: { project: { select: { workspaceId: true } } },
      });

      if (!board) return sendNotFound(res, 'Board');

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: board.project.workspaceId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership || !roles.includes(membership.role)) {
        return sendForbidden(res);
      }

      req.workspaceRole = membership.role;
      req.workspaceId = board.project.workspaceId;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export async function checkTaskAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = req.params.taskId;
    if (!taskId) return next();

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          include: { project: { include: { workspace: true } } },
        },
      },
    });

    if (!task) {
      return sendNotFound(res, 'Task');
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: task.board.project.workspaceId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      return sendForbidden(res);
    }

    req.workspaceRole = membership.role;
    req.workspaceId = task.board.project.workspaceId;
    next();
  } catch (err) {
    next(err);
  }
}

export async function checkCommentAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const commentId = req.params.commentId;
    if (!commentId) return next();

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: { board: { include: { project: { include: { workspace: true } } } } },
        },
      },
    });

    if (!comment) {
      return sendNotFound(res, 'Comment');
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: comment.task.board.project.workspaceId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      return sendForbidden(res);
    }

    req.workspaceRole = membership.role;
    req.workspaceId = comment.task.board.project.workspaceId;
    next();
  } catch (err) {
    next(err);
  }
}

declare global {
  namespace Express {
    interface Request {
      workspaceRole?: string;
      workspaceId?: string;
    }
  }
}
