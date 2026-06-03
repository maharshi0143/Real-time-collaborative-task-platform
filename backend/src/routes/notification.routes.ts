import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', notificationController.list.bind(notificationController));
router.patch('/read', notificationController.markAsRead.bind(notificationController));
router.delete('/:notificationId', notificationController.delete.bind(notificationController));

export default router;
