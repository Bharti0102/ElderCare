import { Response, NextFunction } from 'express';
import { ChatService } from '../services/chat/chat.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types/auth';

export class ChatController {
  public static async getHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const messages = await ChatService.getRecentMessages(req.user!.id, 30);
      sendSuccess(res, { messages }, 'Chat history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async clearHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await ChatService.clearHistory(req.user!.id);
      sendSuccess(res, null, 'Chat history cleared successfully');
    } catch (error) {
      next(error);
    }
  }
}
