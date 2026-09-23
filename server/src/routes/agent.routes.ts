import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Orchestrator requires authentication
router.post('/', authenticate, AgentController.processMessage);

export default router;
