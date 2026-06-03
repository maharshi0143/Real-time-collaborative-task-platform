import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service';
import { sendSuccess, sendValidationError } from '../utils/response';
import { createProjectSchema, updateProjectSchema, createBoardSchema, updateBoardSchema } from '../validators/project';

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = createProjectSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const project = await projectService.create(
        req.params.workspaceId,
        result.data.name,
        result.data.description,
        req.user!.id
      );

      const user = await (await import('../utils/prisma')).prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, username: true },
      });
      project.createdBy = user || { id: req.user!.id, username: '' };

      return sendSuccess(res, { project }, 201);
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projects = await projectService.list(req.params.workspaceId);
      return sendSuccess(res, { projects });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getById(req.params.projectId);
      return sendSuccess(res, { project });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = updateProjectSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const project = await projectService.update(req.params.projectId, result.data);
      return sendSuccess(res, { project });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await projectService.delete(req.params.projectId);
      return sendSuccess(res, { message: 'Project deleted.' });
    } catch (err) {
      next(err);
    }
  }

  async createBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = createBoardSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const board = await projectService.createBoard(req.params.projectId, result.data.name, result.data.position);
      return sendSuccess(res, { board }, 201);
    } catch (err) {
      next(err);
    }
  }

  async listBoards(req: Request, res: Response, next: NextFunction) {
    try {
      const boards = await projectService.listBoards(req.params.projectId);
      return sendSuccess(res, { boards });
    } catch (err) {
      next(err);
    }
  }

  async updateBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = updateBoardSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const board = await projectService.updateBoard(req.params.boardId, result.data);
      return sendSuccess(res, { board });
    } catch (err) {
      next(err);
    }
  }

  async deleteBoard(req: Request, res: Response, next: NextFunction) {
    try {
      await projectService.deleteBoard(req.params.boardId);
      return sendSuccess(res, { message: 'Board deleted.' });
    } catch (err) {
      next(err);
    }
  }
}

export const projectController = new ProjectController();
