import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All contact routes require authentication
router.use(authenticate);

router.post('/', ContactController.create);
router.get('/', ContactController.list);
router.get('/:id', ContactController.getById);
router.put('/:id', ContactController.update);
router.delete('/:id', ContactController.delete);
router.patch('/:id/primary', ContactController.setPrimary);

export default router;
