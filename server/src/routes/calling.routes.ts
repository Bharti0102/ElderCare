import { Router } from 'express';
import { CallingController } from '../controllers/calling.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All calling endpoints require authentication
router.use(authenticate);

// Caregiver direct-dial
router.post('/caregiver', CallingController.initiateCaregiverCall);

// Call logs & lifecycle
router.get('/', CallingController.getCalls);
router.get('/:id', CallingController.getCallById);
router.patch('/:id/status', CallingController.updateCallStatus);
router.post('/:id/hangup', CallingController.hangupCall);

export default router;
