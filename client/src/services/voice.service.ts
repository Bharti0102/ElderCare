import api from './api';
import { ApiResponse, VoiceProcessResponse } from '../types';

export const processVoiceCommand = async (
  transcript: string
): Promise<VoiceProcessResponse> => {
  const response = await api.post<ApiResponse<VoiceProcessResponse>>(
    '/voice/process',
    { transcript }
  );

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to process voice command');
};

export const getVoiceEngineStatus = async (): Promise<{
  provider: string;
  sttAvailable: boolean;
  ttsAvailable: boolean;
}> => {
  const response = await api.get<ApiResponse<{
    provider: string;
    sttAvailable: boolean;
    ttsAvailable: boolean;
  }>>('/voice/status');

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to get voice status');
};
