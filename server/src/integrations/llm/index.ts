import { LLMProvider } from './llm.interface';
import { MockLLMProvider } from './mock.provider';
import { GeminiLLMProvider } from './gemini.provider';
import { MultilingualLLMProvider } from './multilingual.provider';

export * from './llm.interface';
export * from './mock.provider';
export * from './gemini.provider';
export * from './multilingual.provider';

export const getLLMProvider = (): LLMProvider => {
  return new MultilingualLLMProvider();
};

