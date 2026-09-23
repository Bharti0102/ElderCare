import { getLLMProvider, LLMProvider, ChatMessage, LLMResponse, IntentResult } from '../../integrations/llm';

export class LLMService {
  private static provider: LLMProvider = getLLMProvider();

  public static async classifyIntent(userInput: string): Promise<IntentResult> {
    return this.provider.classifyIntent(userInput);
  }

  public static async generateResponse(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    return this.provider.chat(messages, systemPrompt);
  }

  public static getProviderName(): string {
    return this.provider.name;
  }
}
