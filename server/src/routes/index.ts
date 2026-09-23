import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import contactRoutes from './contact.routes';

const router = Router();

// Mount API routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/contacts', contactRoutes);

export default router;
