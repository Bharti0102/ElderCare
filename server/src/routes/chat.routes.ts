import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/history', ChatController.getHistory);
router.delete('/history', ChatController.clearHistory);

export default router;
