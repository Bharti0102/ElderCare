export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export type KnownIntent =
  | 'CHAT'
  | 'CREATE_REMINDER'
  | 'CALL_CAREGIVER'
  | 'PRESCRIPTION'
  | 'HOSPITAL_CALL';

export interface IntentResult {
  intent: KnownIntent;
  confidence: number;
  reasoning?: string;
  extractedParameters?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  intent?: KnownIntent;
  suggestions?: string[];
  raw?: any;
}

export interface LLMProvider {
  name: string;
  chat(messages: ChatMessage[], systemPrompt?: string, language?: string): Promise<LLMResponse>;
  classifyIntent(userInput: string): Promise<IntentResult>;
}
