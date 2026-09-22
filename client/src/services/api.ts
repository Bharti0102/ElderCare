import axios, { AxiosInstance } from 'axios';
import { ApiResponse, HealthData } from '../types';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const getHealthStatus = async (): Promise<HealthData> => {
  const response = await api.get<ApiResponse<HealthData>>('/health');
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.error?.message || 'Failed to retrieve system health');
};

export default api;
