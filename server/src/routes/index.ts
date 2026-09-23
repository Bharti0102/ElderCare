import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import contactRoutes from './contact.routes';
import agentRoutes from './agent.routes';
import chatRoutes from './chat.routes';
import reminderRoutes from './reminder.routes';
import prescriptionRoutes from './prescription.routes';
import callingRoutes from './calling.routes';

const router = Router();

// Mount API routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/contacts', contactRoutes);
router.use('/agent', agentRoutes);
router.use('/chat', chatRoutes);
router.use('/reminders', reminderRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/calls', callingRoutes);

export default router;
