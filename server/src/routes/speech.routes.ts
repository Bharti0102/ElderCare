import { Router } from 'express';
import { SpeechController } from '../controllers/speech.controller';
import { authenticate } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// All voice endpoints require authentication
router.use(authenticate);

// Voice process pipeline (voice transcript or audio file -> AI Orchestrator -> Voice Output)
router.post('/process', upload.single('audio'), SpeechController.processVoice);

// Audio transcription only
router.post('/transcribe', upload.single('audio'), SpeechController.transcribe);

// Speech engine status
router.get('/status', SpeechController.getStatus);

export default router;
