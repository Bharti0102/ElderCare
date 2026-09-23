import { AITool, ToolExecutionResult } from './tool.interface';
import { ChatService } from '../../chat/chat.service';
import { LLMService } from '../llm.service';

export class ChatTool implements AITool {
  public readonly name = 'chat_tool';
  public readonly description = 'Handles empathetic conversation, storytelling, and companionship dialogue.';

  public async execute(
    userId: string,
    parameters: { message: string }
  ): Promise<ToolExecutionResult> {
    const userMessage = parameters.message;

    // 1. Record user message
    await ChatService.addMessage(userId, 'user', userMessage, 'CHAT');

    // 2. Fetch conversation context
    const history = await ChatService.getRecentMessages(userId, 10);

    // 3. Generate response via LLM service
    const llmResponse = await LLMService.generateResponse(history);

    // 4. Record assistant message
    await ChatService.addMessage(userId, 'assistant', llmResponse.content, 'CHAT');

    return {
      success: true,
      message: llmResponse.content,
      suggestions: llmResponse.suggestions || [
        'Tell me a story',
        'How are you today?',
        'Who is my caregiver?',
      ],
    };
  }
}
