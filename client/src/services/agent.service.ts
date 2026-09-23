import api from './api';
import { ApiResponse } from '../types';

export interface AgentResponseData {
  reply: string;
  intent: 'CHAT' | 'CREATE_REMINDER' | 'CALL_CAREGIVER' | 'PRESCRIPTION' | 'HOSPITAL_CALL';
  confidence: number;
  suggestions?: string[];
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export const sendAgentMessage = async (message: string): Promise<AgentResponseData> => {
  const response = await api.post<ApiResponse<AgentResponseData>>('/agent', { message });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to get response from AI agent');
};

export const getChatHistory = async (): Promise<ChatHistoryMessage[]> => {
  const response = await api.get<ApiResponse<{ messages: ChatHistoryMessage[] }>>('/chat/history');
  if (response.data.success && response.data.data) {
    return response.data.data.messages;
  }
  return [];
};

export const clearChatHistory = async (): Promise<void> => {
  await api.delete('/chat/history');
};
