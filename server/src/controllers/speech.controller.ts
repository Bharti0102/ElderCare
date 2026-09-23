import { Response, NextFunction } from 'express';
import { SpeechService } from '../services/speech/speech.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types/auth';

export class SpeechController {
  public static async processVoice(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const transcript = req.body?.transcript as string | undefined;
      const audioBuffer = (req as any).file?.buffer as Buffer | undefined;
      const mimeType = (req as any).file?.mimetype as string | undefined;

      const result = await SpeechService.processVoiceInput(req.user!.id, {
        transcript,
        audioBuffer,
        mimeType,
      });

      sendSuccess(res, result, 'Voice command processed successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async transcribe(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const audioBuffer = (req as any).file?.buffer || Buffer.from(req.body?.audioBase64 || '', 'base64');
      const mimeType = req.body?.mimeType || 'audio/wav';

      const result = await SpeechService.transcribe(audioBuffer, mimeType);
      sendSuccess(res, result, 'Audio transcribed successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = SpeechService.getStatus();
      sendSuccess(res, status, 'Speech engine status retrieved');
    } catch (err) {
      next(err);
    }
  }
}
