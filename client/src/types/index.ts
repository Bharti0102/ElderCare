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
