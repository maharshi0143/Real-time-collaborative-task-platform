import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/logout', authMiddleware, authController.logout.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.get('/me', authMiddleware, authController.me.bind(authController));
router.patch('/me', authMiddleware, authController.updateMe.bind(authController));

export default router;
