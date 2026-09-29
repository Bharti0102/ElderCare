import { Response, NextFunction } from 'express';
import { ChatService } from '../services/chat/chat.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types/auth';

export class ChatController {
  public static async listSessions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const sessions = await ChatService.listSessions(req.user!.id);
      sendSuccess(res, { sessions }, 'Chat sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async createSession(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const session = await ChatService.createSession(req.user!.id, req.body?.title);
      sendSuccess(res, { session }, 'Chat session created successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const sessionId = req.query.sessionId as string | undefined;
      const conversation = await ChatService.getOrCreateConversation(req.user!.id, sessionId);
      const messages = conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        intent: m.intent,
      }));

      sendSuccess(
        res,
        {
          sessionId: conversation._id.toString(),
          title: conversation.title,
          messages,
        },
        'Chat history retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  public static async deleteSession(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const success = await ChatService.deleteSession(req.user!.id, id);
      sendSuccess(res, { success }, 'Chat session deleted successfully');
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
      const sessionId = req.query.sessionId as string | undefined;
      await ChatService.clearHistory(req.user!.id, sessionId);
      sendSuccess(res, null, 'Chat history cleared successfully');
    } catch (error) {
      next(error);
    }
  }
}
