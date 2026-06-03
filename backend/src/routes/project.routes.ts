import { Router } from 'express';
import { projectController } from '../controllers/project.controller';
import { authMiddleware } from '../middleware/auth';
import { checkProjectAccess, requireProjectRole } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

router.get('/:projectId', checkProjectAccess, projectController.getById.bind(projectController));
router.patch('/:projectId', requireProjectRole('admin', 'manager'), projectController.update.bind(projectController));
router.delete('/:projectId', requireProjectRole('admin'), projectController.delete.bind(projectController));

router.post('/:projectId/boards', requireProjectRole('admin', 'manager'), projectController.createBoard.bind(projectController));
router.get('/:projectId/boards', checkProjectAccess, projectController.listBoards.bind(projectController));

export default router;
