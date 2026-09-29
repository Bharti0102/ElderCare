import api from './api';
import {
  ApiResponse,
  Prescription,
  ConfirmPrescriptionDTO,
  CreateRemindersFromPrescriptionDTO,
  Reminder,
} from '../types';

export const uploadPrescription = async (file: File): Promise<Prescription> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ApiResponse<{ prescription: Prescription }>>(
    '/prescriptions/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for multimodal AI Vision OCR + Clinical NLP + Drug lookup
    }
  );

  if (response.data.success && response.data.data) {
    return response.data.data.prescription;
  }
  throw new Error(response.data.error?.message || 'Failed to upload and analyze prescription');
};

export const getPrescriptions = async (): Promise<Prescription[]> => {
  const response = await api.get<ApiResponse<{ prescriptions: Prescription[] }>>(
    '/prescriptions',
    {
      timeout: 60000,
    }
  );
  if (response.data.success && response.data.data) {
    return response.data.data.prescriptions;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch prescriptions');
};

export const getPrescriptionById = async (id: string): Promise<Prescription> => {
  const response = await api.get<ApiResponse<{ prescription: Prescription }>>(
    `/prescriptions/${id}`
  );
  if (response.data.success && response.data.data) {
    return response.data.data.prescription;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch prescription details');
};

export const confirmPrescription = async (
  id: string,
  data: ConfirmPrescriptionDTO
): Promise<Prescription> => {
  const response = await api.put<ApiResponse<{ prescription: Prescription }>>(
    `/prescriptions/${id}/confirm`,
    data
  );
  if (response.data.success && response.data.data) {
    return response.data.data.prescription;
  }
  throw new Error(response.data.error?.message || 'Failed to confirm prescription');
};

export const createRemindersFromPrescription = async (
  id: string,
  data?: CreateRemindersFromPrescriptionDTO
): Promise<{ reminders: Reminder[]; count: number }> => {
  const response = await api.post<
    ApiResponse<{ reminders: Reminder[]; count: number }>
  >(`/prescriptions/${id}/create-reminders`, data || {});

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(
    response.data.error?.message || 'Failed to generate reminders from prescription'
  );
};

export const deletePrescription = async (id: string): Promise<void> => {
  const response = await api.delete<ApiResponse<null>>(`/prescriptions/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to delete prescription');
  }
};

export const lookupMedicine = async (data: {
  name: string;
  dosage?: string;
  instructions?: string;
}): Promise<any> => {
  const response = await api.post<ApiResponse<{ details: any }>>(
    '/prescriptions/lookup-medicine',
    data,
    {
      timeout: 60000,
    }
  );
  if (response.data.success && response.data.data) {
    return response.data.data.details;
  }
  throw new Error(response.data.error?.message || 'Failed to lookup medicine details');
};

export interface AIChatResult {
  reply: string;
  identifiedMedicine?: any;
  suggestedFollowUps?: string[];
}

export const chatWithAIAssistant = async (
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<AIChatResult> => {
  const response = await api.post<ApiResponse<AIChatResult>>(
    '/prescriptions/ai-chat',
    { message, history },
    { timeout: 60000 }
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to get AI assistant response');
};

export const chatWithAIVisionAssistant = async (
  file: File,
  message?: string
): Promise<AIChatResult & { identifiedMedicines?: any[]; doctor?: any; hospital?: any }> => {
  const formData = new FormData();
  formData.append('file', file);
  if (message) {
    formData.append('message', message);
  }

  const response = await api.post<
    ApiResponse<AIChatResult & { identifiedMedicines?: any[]; doctor?: any; hospital?: any }>
  >('/prescriptions/ai-chat-vision', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to analyze prescription image with AI');
};


