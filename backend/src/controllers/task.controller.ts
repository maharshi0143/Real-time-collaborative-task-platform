import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';
import { sendSuccess, sendValidationError } from '../utils/response';
import { createTaskSchema, updateTaskSchema, moveTaskSchema, addCommentSchema, updateCommentSchema } from '../validators/task';

export class TaskController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = createTaskSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const task = await taskService.create(req.params.boardId, {
        ...result.data,
        createdBy: req.user!.id,
      });

      return sendSuccess(res, { task }, 201);
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page, limit, assigneeId, priority, status, tags,
        dueBefore, dueAfter, search, sortBy, sortOrder,
      } = req.query as any;

      const result = await taskService.list(req.params.boardId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        assigneeId,
        priority,
        status,
        tags,
        dueBefore,
        dueAfter,
        search,
        sortBy,
        sortOrder,
      });

      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.getById(req.params.taskId);
      return sendSuccess(res, { task });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = updateTaskSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const task = await taskService.update(req.params.taskId, result.data, req.user!.id);
      return sendSuccess(res, { task });
    } catch (err) {
      next(err);
    }
  }

  async move(req: Request, res: Response, next: NextFunction) {
    try {
      const result = moveTaskSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const task = await taskService.move(
        req.params.taskId,
        result.data.boardId,
        result.data.position,
        req.user!.id
      );

      return sendSuccess(res, { task });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await taskService.delete(req.params.taskId, req.user!.id);
      return sendSuccess(res, { message: 'Task deleted.' });
    } catch (err) {
      next(err);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = addCommentSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const comment = await taskService.addComment(
        req.params.taskId,
        result.data.content,
        req.user!.id,
        result.data.parentId
      );

      return sendSuccess(res, { comment }, 201);
    } catch (err) {
      next(err);
    }
  }

  async listComments(req: Request, res: Response, next: NextFunction) {
    try {
      const comments = await taskService.listComments(req.params.taskId);
      return sendSuccess(res, { comments });
    } catch (err) {
      next(err);
    }
  }

  async updateComment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = updateCommentSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const comment = await taskService.updateComment(req.params.commentId, result.data.content, req.user!.id);
      return sendSuccess(res, { comment });
    } catch (err) {
      next(err);
    }
  }

  async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      await taskService.deleteComment(req.params.commentId, req.user!.id);
      return sendSuccess(res, { message: 'Comment deleted.' });
    } catch (err) {
      next(err);
    }
  }

  async getActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const activity = await taskService.getActivity(req.params.taskId);
      return sendSuccess(res, { activity });
    } catch (err) {
      next(err);
    }
  }
}

export const taskController = new TaskController();
