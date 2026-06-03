import { Request, Response, NextFunction } from 'express';
import { workspaceService } from '../services/workspace.service';
import { sendSuccess, sendValidationError } from '../utils/response';
import { createWorkspaceSchema, addMemberSchema, updateMemberRoleSchema, updateWorkspaceSchema } from '../validators/workspace';

export class WorkspaceController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = createWorkspaceSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const workspace = await workspaceService.create(result.data.name, result.data.slug, req.user!.id);
      return sendSuccess(res, { workspace }, 201);
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaces = await workspaceService.list(req.user!.id);
      return sendSuccess(res, { workspaces });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await workspaceService.getById(req.params.workspaceId, req.user!.id);
      return sendSuccess(res, { workspace });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = updateWorkspaceSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const workspace = await workspaceService.update(req.params.workspaceId, result.data, req.user!.id);
      return sendSuccess(res, { workspace });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await workspaceService.delete(req.params.workspaceId);
      return sendSuccess(res, { message: 'Workspace deleted.' });
    } catch (err) {
      next(err);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = addMemberSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const member = await workspaceService.addMember(
        req.params.workspaceId,
        result.data.email,
        result.data.role,
        req.user!.id
      );
      return sendSuccess(res, { member });
    } catch (err) {
      next(err);
    }
  }

  async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await workspaceService.listMembers(req.params.workspaceId);
      return sendSuccess(res, { members });
    } catch (err) {
      next(err);
    }
  }

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const result = updateMemberRoleSchema.safeParse(req.body);
      if (!result.success) {
        return sendValidationError(res, result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })));
      }

      const member = await workspaceService.updateMemberRole(
        req.params.workspaceId,
        req.params.userId,
        result.data.role,
        req.user!.id
      );
      return sendSuccess(res, { member });
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      await workspaceService.removeMember(req.params.workspaceId, req.params.userId, req.user!.id);
      return sendSuccess(res, { message: 'Member removed.' });
    } catch (err) {
      next(err);
    }
  }
}

export const workspaceController = new WorkspaceController();
