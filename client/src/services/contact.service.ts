import api from './api';
import { ApiResponse, EmergencyContact, CreateContactDTO, UpdateContactDTO } from '../types';

export const getContacts = async (): Promise<EmergencyContact[]> => {
  const response = await api.get<ApiResponse<{ contacts: EmergencyContact[] }>>('/contacts');
  if (response.data.success && response.data.data) {
    return response.data.data.contacts;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch emergency contacts');
};

export const createContact = async (data: CreateContactDTO): Promise<EmergencyContact> => {
  const response = await api.post<ApiResponse<{ contact: EmergencyContact }>>('/contacts', data);
  if (response.data.success && response.data.data) {
    return response.data.data.contact;
  }
  throw new Error(response.data.error?.message || 'Failed to create emergency contact');
};

export const updateContact = async (
  id: string,
  data: UpdateContactDTO
): Promise<EmergencyContact> => {
  const response = await api.put<ApiResponse<{ contact: EmergencyContact }>>(`/contacts/${id}`, data);
  if (response.data.success && response.data.data) {
    return response.data.data.contact;
  }
  throw new Error(response.data.error?.message || 'Failed to update emergency contact');
};

export const deleteContact = async (id: string): Promise<void> => {
  const response = await api.delete<ApiResponse<null>>(`/contacts/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to delete emergency contact');
  }
};

export const setPrimaryContact = async (id: string): Promise<EmergencyContact> => {
  const response = await api.patch<ApiResponse<{ contact: EmergencyContact }>>(
    `/contacts/${id}/primary`
  );
  if (response.data.success && response.data.data) {
    return response.data.data.contact;
  }
  throw new Error(response.data.error?.message || 'Failed to set primary contact');
};
