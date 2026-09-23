import api from './api';
import { ApiResponse, Reminder, CreateReminderDTO, UpdateReminderDTO } from '../types';

export const getReminders = async (status?: string): Promise<Reminder[]> => {
  const params = status && status !== 'ALL' ? { status } : {};
  const response = await api.get<ApiResponse<{ reminders: Reminder[] }>>('/reminders', { params });
  if (response.data.success && response.data.data) {
    return response.data.data.reminders;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch reminders');
};

export const getDueReminders = async (): Promise<Reminder[]> => {
  const response = await api.get<ApiResponse<{ reminders: Reminder[] }>>('/reminders/due');
  if (response.data.success && response.data.data) {
    return response.data.data.reminders;
  }
  return [];
};

export const createReminder = async (data: CreateReminderDTO): Promise<Reminder> => {
  const response = await api.post<ApiResponse<{ reminder: Reminder }>>('/reminders', data);
  if (response.data.success && response.data.data) {
    return response.data.data.reminder;
  }
  throw new Error(response.data.error?.message || 'Failed to create reminder');
};

export const updateReminder = async (id: string, data: UpdateReminderDTO): Promise<Reminder> => {
  const response = await api.put<ApiResponse<{ reminder: Reminder }>>(`/reminders/${id}`, data);
  if (response.data.success && response.data.data) {
    return response.data.data.reminder;
  }
  throw new Error(response.data.error?.message || 'Failed to update reminder');
};

export const deleteReminder = async (id: string): Promise<void> => {
  const response = await api.delete<ApiResponse<null>>(`/reminders/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to delete reminder');
  }
};

export const completeReminder = async (
  id: string
): Promise<{ reminder: Reminder; recurringNextDate?: string }> => {
  const response = await api.patch<ApiResponse<{ reminder: Reminder; recurringNextDate?: string }>>(
    `/reminders/${id}/complete`
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to complete reminder');
};

export const snoozeReminder = async (id: string, minutes = 10): Promise<Reminder> => {
  const response = await api.patch<ApiResponse<{ reminder: Reminder }>>(
    `/reminders/${id}/snooze`,
    { minutes }
  );
  if (response.data.success && response.data.data) {
    return response.data.data.reminder;
  }
  throw new Error(response.data.error?.message || 'Failed to snooze reminder');
};
