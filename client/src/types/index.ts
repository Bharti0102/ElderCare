export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface DatabaseStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  host?: string;
  name?: string;
  error?: string;
}

export interface HealthData {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  database: DatabaseStatus;
  version: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface EmergencyContact {
  _id: string;
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDTO {
  name: string;
  relationship: string;
  phone: string;
  isPrimary?: boolean;
}

export interface UpdateContactDTO {
  name?: string;
  relationship?: string;
  phone?: string;
  isPrimary?: boolean;
}

export type ReminderCategory = 'MEDICATION' | 'APPOINTMENT' | 'HYDRATION' | 'GENERAL';
export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly';
export type ReminderStatus = 'PENDING' | 'COMPLETED' | 'SNOOZED' | 'CANCELLED';

export interface Reminder {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  category: ReminderCategory;
  scheduledAt: string;
  repeat: ReminderRepeat;
  status: ReminderStatus;
  snoozedUntil?: string;
  lastNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderDTO {
  title: string;
  description?: string;
  category?: ReminderCategory;
  scheduledAt: string | Date;
  repeat?: ReminderRepeat;
}

export interface UpdateReminderDTO {
  title?: string;
  description?: string;
  category?: ReminderCategory;
  scheduledAt?: string | Date;
  repeat?: ReminderRepeat;
  status?: ReminderStatus;
}
