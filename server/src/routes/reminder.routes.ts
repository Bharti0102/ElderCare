import { Router } from 'express';
import { ReminderController } from '../controllers/reminder.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', ReminderController.create);
router.get('/', ReminderController.list);
router.get('/due', ReminderController.getDue);
router.get('/:id', ReminderController.getById);
router.put('/:id', ReminderController.update);
router.delete('/:id', ReminderController.delete);
router.patch('/:id/complete', ReminderController.complete);
router.patch('/:id/snooze', ReminderController.snooze);

export default router;
