import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Mount Health Check route
router.use('/health', healthRoutes);

export default router;
