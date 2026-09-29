import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrchestratorService } from '../services/ai/orchestrator.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types/auth';

const messageSchema = z.object({
  message: z.string({ required_error: 'Message is required' }).trim().min(1, 'Message cannot be empty'),
  sessionId: z.string().optional(),
  language: z.string().optional(),
});

export class AgentController {
  public static async processMessage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { message, sessionId, language } = messageSchema.parse(req.body);
      const result = await OrchestratorService.processMessage(req.user!.id, message, {
        sessionId,
        language,
      });

      sendSuccess(
        res,
        {
          reply: result.reply,
          intent: result.intent,
          confidence: result.confidence,
          suggestions: result.suggestions,
          toolResults: result.toolResults,
        },
        'Response generated successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}
