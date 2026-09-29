import { AITool, ToolExecutionResult } from './tool.interface';
import { ChatService } from '../../chat/chat.service';
import { LLMService } from '../llm.service';

export interface ChatToolInput {
  message: string;
  sessionId?: string;
  language?: string;
}

export class ChatTool implements AITool {
  public readonly name = 'chat_tool';
  public readonly description = 'Handles empathetic conversation, storytelling, and companionship dialogue.';

  public async execute(
    userId: string,
    parameters: ChatToolInput
  ): Promise<ToolExecutionResult> {
    const userMessage = parameters.message;
    const sessionId = parameters.sessionId;
    const language = parameters.language;

    // 1. Record user message in target session
    await ChatService.addMessage(userId, 'user', userMessage, 'CHAT', sessionId);

    // 2. Fetch conversation context from target session
    const history = await ChatService.getRecentMessages(userId, 10, sessionId);

    // 3. Generate response via LLM service with dynamic language preference
    const llmResponse = await LLMService.generateResponse(history, undefined, language);

    // 4. Record assistant message in target session
    await ChatService.addMessage(userId, 'assistant', llmResponse.content, 'CHAT', sessionId);

    return {
      success: true,
      message: llmResponse.content,
      suggestions: llmResponse.suggestions || [
        'Tell me a story in English',
        'एक सुंदर कहानी सुनाओ',
        'How are you today?',
        'Who is my caregiver?',
      ],
    };
  }
}
