import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All appointment endpoints require authentication
router.use(authenticate);

// Saved Clinic & Reception Directory
router.get('/receptions', AppointmentController.listReceptions);
router.post('/receptions', AppointmentController.createReception);
router.put('/receptions/:id', AppointmentController.updateReception);
router.delete('/receptions/:id', AppointmentController.deleteReception);

// Hospital Calling Endpoints (Mode A vs Mode B)
router.post('/call/human', AppointmentController.initiateHumanCall);
router.post('/call/ai', AppointmentController.initiateAICall);

// Hospital Target Resolution (from Prescriptions)
router.get('/target', AppointmentController.getTarget);

// Direct Appointment Booking
router.post('/', AppointmentController.createDirect);

// Appointment Management & Lifecycle
router.get('/', AppointmentController.list);
router.get('/:id', AppointmentController.getById);
router.post('/:id/confirm', AppointmentController.confirm);
router.post('/:id/cancel', AppointmentController.cancel);
router.delete('/:id', AppointmentController.delete);

export default router;

