import api from './api';
import { ApiResponse, Call, InitiateCallDTO } from '../types';

export const initiateCaregiverCall = async (
  data?: InitiateCallDTO
): Promise<Call> => {
  const response = await api.post<ApiResponse<{ call: Call }>>(
    '/calls/caregiver',
    data || {}
  );
  if (response.data.success && response.data.data) {
    return response.data.data.call;
  }
  throw new Error(
    response.data.error?.message || 'Failed to initiate caregiver call'
  );
};

export const getCalls = async (filter?: {
  type?: string;
  status?: string;
}): Promise<Call[]> => {
  const response = await api.get<ApiResponse<{ calls: Call[] }>>('/calls', {
    params: filter,
  });
  if (response.data.success && response.data.data) {
    return response.data.data.calls;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch call history');
};

export const getCallById = async (id: string): Promise<Call> => {
  const response = await api.get<ApiResponse<{ call: Call }>>(`/calls/${id}`);
  if (response.data.success && response.data.data) {
    return response.data.data.call;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch call status');
};

export const updateCallStatus = async (
  id: string,
  status: string,
  durationSeconds?: number
): Promise<Call> => {
  const response = await api.patch<ApiResponse<{ call: Call }>>(
    `/calls/${id}/status`,
    { status, durationSeconds }
  );
  if (response.data.success && response.data.data) {
    return response.data.data.call;
  }
  throw new Error(response.data.error?.message || 'Failed to update call status');
};

export const hangupCall = async (id: string): Promise<Call> => {
  const response = await api.post<ApiResponse<{ call: Call }>>(
    `/calls/${id}/hangup`
  );
  if (response.data.success && response.data.data) {
    return response.data.data.call;
  }
  throw new Error(response.data.error?.message || 'Failed to hang up call');
};

export interface TelephonyStatus {
  provider: string;
  configured: boolean;
  isTrial: boolean;
  accountSid?: string;
  hasPurchasedNumber: boolean;
  hasVerifiedCallerId: boolean;
  activeFromNumber?: string | null;
  message: string;
  instructions?: string;
  secondaryProvider?: {
    name: string;
    configured: boolean;
    accountSid?: string;
    message?: string;
  };
}

export const getTelephonyStatus = async (): Promise<TelephonyStatus> => {
  const response = await api.get<ApiResponse<TelephonyStatus>>('/calls/telephony/status');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch telephony status');
};
