import { Router } from 'express';
import { AIConfigController } from '../controllers/ai-config.controller';

const router = Router();

router.get('/', AIConfigController.getStatus);
router.post('/update', AIConfigController.updateConfig);
router.post('/test', AIConfigController.testKey);

export default router;
