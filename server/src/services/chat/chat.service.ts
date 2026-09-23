import { Types } from 'mongoose';
import { Conversation, IConversation, IMessage } from '../../models/Conversation';
import { ChatMessage } from '../../integrations/llm/llm.interface';

export class ChatService {
  public static async getOrCreateConversation(userId: string): Promise<IConversation> {
    const userObjectId = new Types.ObjectId(userId);
    let conversation = await Conversation.findOne({ userId: userObjectId });

    if (!conversation) {
      conversation = await Conversation.create({
        userId: userObjectId,
        messages: [],
      });
    }

    return conversation;
  }

  public static async addMessage(
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    intent = 'CHAT'
  ): Promise<IMessage> {
    const conversation = await this.getOrCreateConversation(userId);
    const message: IMessage = {
      role,
      content,
      intent,
      timestamp: new Date(),
    };

    conversation.messages.push(message);

    // Keep conversation to last 50 messages to prevent unbounded growth
    if (conversation.messages.length > 50) {
      conversation.messages = conversation.messages.slice(-50);
    }

    await conversation.save();
    return message;
  }

  public static async getRecentMessages(
    userId: string,
    limit = 20
  ): Promise<ChatMessage[]> {
    const conversation = await this.getOrCreateConversation(userId);
    const sliced = conversation.messages.slice(-limit);

    return sliced.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
  }

  public static async clearHistory(userId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    await Conversation.findOneAndUpdate(
      { userId: userObjectId },
      { $set: { messages: [] } },
      { upsert: true }
    );
  }
}
