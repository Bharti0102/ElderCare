import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import contactRoutes from './contact.routes';
import agentRoutes from './agent.routes';
import chatRoutes from './chat.routes';

const router = Router();

// Mount API routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/contacts', contactRoutes);
router.use('/agent', agentRoutes);
router.use('/chat', chatRoutes);

export default router;
