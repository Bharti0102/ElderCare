import { LLMProvider } from './llm.interface';
import { MockLLMProvider } from './mock.provider';
import { GeminiLLMProvider } from './gemini.provider';
import { env } from '../../config/env';

export * from './llm.interface';
export * from './mock.provider';
export * from './gemini.provider';

export const getLLMProvider = (): LLMProvider => {
  if (env.LLM_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    return new GeminiLLMProvider(env.GEMINI_API_KEY);
  }

  // Default clean mock/development adapter
  return new MockLLMProvider();
};
