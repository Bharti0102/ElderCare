import { Types } from 'mongoose';
import { Conversation, IConversation, IMessage } from '../../models/Conversation';
import { ChatMessage } from '../../integrations/llm/llm.interface';

export interface ChatSessionSummary {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
}

export class ChatService {
  /**
   * Lists all conversation sessions for a given user.
   */
  public static async listSessions(userId: string): Promise<ChatSessionSummary[]> {
    const userObjectId = new Types.ObjectId(userId);
    const conversations = await Conversation.find({ userId: userObjectId })
      .sort({ updatedAt: -1 })
      .select('title updatedAt messages');

    return conversations.map((conv) => {
      const lastMsg = conv.messages.length > 0 ? conv.messages[conv.messages.length - 1].content : undefined;
      return {
        id: conv._id.toString(),
        title: conv.title || 'New Conversation',
        updatedAt: conv.updatedAt,
        messageCount: conv.messages.length,
        lastMessage: lastMsg ? (lastMsg.length > 60 ? lastMsg.slice(0, 57) + '...' : lastMsg) : undefined,
      };
    });
  }

  /**
   * Creates a new conversation session.
   */
  public static async createSession(userId: string, title?: string): Promise<IConversation> {
    const userObjectId = new Types.ObjectId(userId);
    return Conversation.create({
      userId: userObjectId,
      title: title?.trim() || 'New Conversation',
      messages: [],
    });
  }

  /**
   * Retrieves an existing session or creates a new one.
   */
  public static async getOrCreateConversation(
    userId: string,
    sessionId?: string
  ): Promise<IConversation> {
    const userObjectId = new Types.ObjectId(userId);

    if (sessionId && Types.ObjectId.isValid(sessionId)) {
      const conv = await Conversation.findOne({ _id: new Types.ObjectId(sessionId), userId: userObjectId });
      if (conv) return conv;
    }

    // Fallback: get the most recent conversation session
    let conversation = await Conversation.findOne({ userId: userObjectId }).sort({ updatedAt: -1 });

    if (!conversation) {
      conversation = await Conversation.create({
        userId: userObjectId,
        title: 'New Conversation',
        messages: [],
      });
    }

    return conversation;
  }

  /**
   * Appends a message to the target session and updates the conversation title if it's new.
   */
  public static async addMessage(
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    intent = 'CHAT',
    sessionId?: string
  ): Promise<IMessage> {
    const conversation = await this.getOrCreateConversation(userId, sessionId);
    const message: IMessage = {
      role,
      content,
      intent,
      timestamp: new Date(),
    };

    conversation.messages.push(message);

    // Auto-title conversation on first user message if still default
    if (role === 'user' && (!conversation.title || conversation.title === 'New Conversation')) {
      const cleanSnippet = content.replace(/[\n\r]+/g, ' ').trim();
      const words = cleanSnippet.split(/\s+/).slice(0, 6).join(' ');
      conversation.title = words.length > 35 ? words.slice(0, 32) + '...' : words;
    }

    // Keep conversation to last 50 messages to prevent unbounded growth
    if (conversation.messages.length > 50) {
      conversation.messages = conversation.messages.slice(-50);
    }

    await conversation.save();
    return message;
  }

  /**
   * Retrieves recent messages for prompt context.
   */
  public static async getRecentMessages(
    userId: string,
    limit = 20,
    sessionId?: string
  ): Promise<ChatMessage[]> {
    const conversation = await this.getOrCreateConversation(userId, sessionId);
    const sliced = conversation.messages.slice(-limit);

    return sliced.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
  }

  /**
   * Deletes a specific conversation session.
   */
  public static async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    const userObjectId = new Types.ObjectId(userId);
    if (!Types.ObjectId.isValid(sessionId)) return false;

    const res = await Conversation.deleteOne({ _id: new Types.ObjectId(sessionId), userId: userObjectId });
    return res.deletedCount > 0;
  }

  /**
   * Clears messages in a session (or latest).
   */
  public static async clearHistory(userId: string, sessionId?: string): Promise<void> {
    const conversation = await this.getOrCreateConversation(userId, sessionId);
    conversation.messages = [];
    await conversation.save();
  }
}
