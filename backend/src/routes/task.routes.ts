import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authMiddleware } from '../middleware/auth';
import { checkBoardAccess, checkTaskAccess, checkCommentAccess } from '../middleware/rbac';

const router = Router();

router.use(authMiddleware);

router.get('/tasks/:taskId', checkTaskAccess, taskController.getById.bind(taskController));
router.patch('/tasks/:taskId', checkTaskAccess, taskController.update.bind(taskController));
router.patch('/tasks/:taskId/move', checkTaskAccess, taskController.move.bind(taskController));
router.delete('/tasks/:taskId', checkTaskAccess, taskController.delete.bind(taskController));

router.post('/tasks/:taskId/comments', checkTaskAccess, taskController.addComment.bind(taskController));
router.get('/tasks/:taskId/comments', checkTaskAccess, taskController.listComments.bind(taskController));
router.get('/tasks/:taskId/activity', checkTaskAccess, taskController.getActivity.bind(taskController));

router.patch('/comments/:commentId', checkCommentAccess, taskController.updateComment.bind(taskController));
router.delete('/comments/:commentId', checkCommentAccess, taskController.deleteComment.bind(taskController));

export default router;
