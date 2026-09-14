import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { listNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';

const router = express.Router();

router.use(verifyToken);
router.get('/', listNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

export default router;
