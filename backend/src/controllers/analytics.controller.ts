import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { sendSuccess, sendValidationError } from '../utils/response';

export class AnalyticsController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as any;
      if (!startDate || !endDate) {
        return sendValidationError(res, [
          { field: 'startDate', message: 'startDate is required.' },
          { field: 'endDate', message: 'endDate is required.' },
        ].filter((x) => !req.query[x.field.replace('startDate', 'startDate').replace('endDate', 'endDate')]));
      }

      const data = await analyticsService.getSummary(req.params.workspaceId, startDate, endDate);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getMemberAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as any;
      if (!startDate || !endDate) {
        return sendValidationError(res, [
          { field: 'startDate', message: 'startDate is required.' },
          { field: 'endDate', message: 'endDate is required.' },
        ]);
      }

      const data = await analyticsService.getMemberAnalytics(
        req.params.workspaceId,
        req.params.userId,
        startDate,
        endDate
      );
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
