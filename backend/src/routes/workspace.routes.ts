import { Router } from 'express';
import { workspaceController } from '../controllers/workspace.controller';
import { projectController } from '../controllers/project.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole, checkProjectAccess, requireProjectRole } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

router.post('/', workspaceController.create.bind(workspaceController));
router.get('/', workspaceController.list.bind(workspaceController));
router.get('/:workspaceId', requireWorkspaceRole('admin', 'manager', 'member', 'guest'), workspaceController.getById.bind(workspaceController));
router.patch('/:workspaceId', requireWorkspaceRole('admin'), workspaceController.update.bind(workspaceController));
router.delete('/:workspaceId', requireWorkspaceRole('admin'), workspaceController.delete.bind(workspaceController));

router.post('/:workspaceId/members', requireWorkspaceRole('admin'), workspaceController.addMember.bind(workspaceController));
router.get('/:workspaceId/members', requireWorkspaceRole('admin', 'manager', 'member', 'guest'), workspaceController.listMembers.bind(workspaceController));
router.patch('/:workspaceId/members/:userId', requireWorkspaceRole('admin'), workspaceController.updateMemberRole.bind(workspaceController));
router.delete('/:workspaceId/members/:userId', requireWorkspaceRole('admin'), workspaceController.removeMember.bind(workspaceController));

router.post('/:workspaceId/projects', requireWorkspaceRole('admin', 'manager'), projectController.create.bind(projectController));
router.get('/:workspaceId/projects', requireWorkspaceRole('admin', 'manager', 'member', 'guest'), projectController.list.bind(projectController));
router.get('/:workspaceId/projects/:projectId', checkProjectAccess, projectController.getById.bind(projectController));
router.patch('/:workspaceId/projects/:projectId', requireProjectRole('admin', 'manager'), projectController.update.bind(projectController));
router.delete('/:workspaceId/projects/:projectId', requireProjectRole('admin'), projectController.delete.bind(projectController));

router.get('/:workspaceId/analytics/summary', requireWorkspaceRole('admin', 'manager'), analyticsController.getSummary.bind(analyticsController));
router.get('/:workspaceId/analytics/member/:userId', requireWorkspaceRole('admin', 'manager'), analyticsController.getMemberAnalytics.bind(analyticsController));

export default router;
