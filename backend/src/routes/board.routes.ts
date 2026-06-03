import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { projectController } from '../controllers/project.controller';
import { authMiddleware } from '../middleware/auth';
import { checkBoardAccess, requireBoardRole } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

router.patch('/:boardId', checkBoardAccess, requireBoardRole('admin', 'manager'), projectController.updateBoard.bind(projectController));
router.delete('/:boardId', checkBoardAccess, requireBoardRole('admin', 'manager'), projectController.deleteBoard.bind(projectController));

router.post('/:boardId/tasks', checkBoardAccess, requireBoardRole('admin', 'manager', 'member'), taskController.create.bind(taskController));
router.get('/:boardId/tasks', checkBoardAccess, taskController.list.bind(taskController));

export default router;
