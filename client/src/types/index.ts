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
