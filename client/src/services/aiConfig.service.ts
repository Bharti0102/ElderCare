import api from './api';
import { ApiResponse } from '../types';

export type VisionProviderType = 'groq' | 'gemini' | 'openai' | 'tesseract';

export interface AIProviderInfo {
  id: VisionProviderType;
  name: string;
  active: boolean;
  description: string;
}

export interface AIConfigStatus {
  activeProvider: VisionProviderType;
  hasGroqKey: boolean;
  maskedGroqKey: string | null;
  hasGeminiKey: boolean;
  maskedGeminiKey: string | null;
  hasOpenAIKey: boolean;
  maskedOpenAIKey: string | null;
  availableProviders: AIProviderInfo[];
}

export const getAIConfigStatus = async (): Promise<AIConfigStatus> => {
  const res = await api.get<ApiResponse<AIConfigStatus>>('/settings/ai-config');
  if (res.data.success && res.data.data) {
    return res.data.data;
  }
  throw new Error(res.data.error?.message || 'Failed to fetch AI configuration');
};

export const updateAIConfig = async (payload: {
  geminiApiKey?: string;
  openAiApiKey?: string;
  groqApiKey?: string;
  preferredProvider?: VisionProviderType;
}): Promise<AIConfigStatus> => {
  const res = await api.post<ApiResponse<AIConfigStatus>>('/settings/ai-config/update', payload);
  if (res.data.success && res.data.data) {
    return res.data.data;
  }
  throw new Error(res.data.error?.message || 'Failed to update AI configuration');
};

export const testAIKey = async (payload: {
  provider: 'groq' | 'gemini' | 'openai';
  apiKey?: string;
}): Promise<{ provider: string; status: string }> => {
  const res = await api.post<ApiResponse<{ provider: string; status: string }>>('/settings/ai-config/test', payload);
  if (res.data.success && res.data.data) {
    return res.data.data;
  }
  throw new Error(res.data.error?.message || 'API key verification failed');
};
