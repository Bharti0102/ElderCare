import { Router } from 'express';
import { CallingController } from '../controllers/calling.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public call room endpoint for guest caregiver join screen
router.get('/public/:id', CallingController.getPublicCallInfo);
router.post('/public/:id/hangup', CallingController.publicHangupCall);

// All subsequent calling endpoints require authentication
router.use(authenticate);

// Caregiver direct-dial
router.post('/caregiver', CallingController.initiateCaregiverCall);

// Telephony provider status (Twilio trial / live status)
router.get('/telephony/status', CallingController.getTelephonyStatus);

// Call logs & lifecycle
router.get('/', CallingController.getCalls);
router.get('/:id', CallingController.getCallById);
router.patch('/:id/status', CallingController.updateCallStatus);
router.post('/:id/hangup', CallingController.hangupCall);

export default router;
