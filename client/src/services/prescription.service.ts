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
    }
  );

  if (response.data.success && response.data.data) {
    return response.data.data.prescription;
  }
  throw new Error(response.data.error?.message || 'Failed to upload and analyze prescription');
};

export const getPrescriptions = async (): Promise<Prescription[]> => {
  const response = await api.get<ApiResponse<{ prescriptions: Prescription[] }>>(
    '/prescriptions'
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
