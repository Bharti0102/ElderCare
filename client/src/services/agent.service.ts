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
  intent?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

export interface ChatHistoryResponse {
  sessionId?: string;
  title?: string;
  messages: ChatHistoryMessage[];
}

export const sendAgentMessage = async (
  message: string,
  options?: { sessionId?: string; language?: string }
): Promise<AgentResponseData> => {
  const payload: any = { message };
  if (options?.sessionId) payload.sessionId = options.sessionId;
  if (options?.language && options.language !== 'auto') payload.language = options.language;

  const response = await api.post<ApiResponse<AgentResponseData>>('/agent', payload);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to get response from AI agent');
};

export const getChatSessions = async (): Promise<ChatSession[]> => {
  try {
    const response = await api.get<ApiResponse<{ sessions: ChatSession[] }>>('/chat/sessions');
    if (response.data.success && response.data.data?.sessions) {
      return response.data.data.sessions;
    }
  } catch (err) {
    console.warn('[agent.service] getChatSessions note:', err);
  }
  return [];
};

export const createChatSession = async (title?: string): Promise<string | null> => {
  try {
    const response = await api.post<ApiResponse<{ session: any }>>('/chat/sessions', { title });
    if (response.data.success && response.data.data?.session) {
      return response.data.data.session._id;
    }
  } catch (err) {
    console.error('[agent.service] createChatSession error:', err);
  }
  return null;
};

export const deleteChatSession = async (sessionId: string): Promise<boolean> => {
  try {
    const response = await api.delete<ApiResponse<{ success: boolean }>>(`/chat/sessions/${sessionId}`);
    return !!response.data.success;
  } catch {
    return false;
  }
};

export const getChatHistory = async (sessionId?: string): Promise<ChatHistoryResponse> => {
  const url = sessionId ? `/chat/history?sessionId=${sessionId}` : '/chat/history';
  const response = await api.get<ApiResponse<ChatHistoryResponse>>(url);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return { messages: [] };
};

export const clearChatHistory = async (sessionId?: string): Promise<void> => {
  const url = sessionId ? `/chat/history?sessionId=${sessionId}` : '/chat/history';
  await api.delete(url);
};
