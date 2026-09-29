import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// ChatGPT-Style Conversation Sessions
router.get('/sessions', ChatController.listSessions);
router.post('/sessions', ChatController.createSession);
router.delete('/sessions/:id', ChatController.deleteSession);

// Conversation Messages
router.get('/history', ChatController.getHistory);
router.delete('/history', ChatController.clearHistory);

export default router;
