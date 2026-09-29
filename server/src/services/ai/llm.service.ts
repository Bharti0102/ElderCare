import { getLLMProvider, LLMProvider, ChatMessage, LLMResponse, IntentResult } from '../../integrations/llm';

export class LLMService {
  private static provider: LLMProvider = getLLMProvider();

  public static async classifyIntent(userInput: string): Promise<IntentResult> {
    return this.provider.classifyIntent(userInput);
  }

  public static async generateResponse(
    messages: ChatMessage[],
    systemPrompt?: string,
    language?: string
  ): Promise<LLMResponse> {
    return this.provider.chat(messages, systemPrompt, language);
  }

  public static getProviderName(): string {
    return this.provider.name;
  }
}
