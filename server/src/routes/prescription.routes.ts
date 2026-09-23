import { Router } from 'express';
import { PrescriptionController } from '../controllers/prescription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { prescriptionUpload } from '../middleware/upload.middleware';

const router = Router();

// All prescription endpoints require authentication
router.use(authenticate);

// Multipart upload & analyze
router.post('/upload', prescriptionUpload.single('file'), PrescriptionController.uploadAndAnalyze);

// Medicine information lookup & AI simple language explanation
router.post('/lookup-medicine', PrescriptionController.lookupMedicine);

// Prescription CRUD & Bridging
router.get('/', PrescriptionController.getPrescriptions);
router.get('/:id', PrescriptionController.getPrescriptionById);
router.put('/:id/confirm', PrescriptionController.confirmPrescription);
router.post('/:id/create-reminders', PrescriptionController.bridgeToReminders);
router.delete('/:id', PrescriptionController.deletePrescription);

export default router;
