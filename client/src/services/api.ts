import axios, { AxiosInstance } from 'axios';
import { ApiResponse, HealthData } from '../types';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000, // 60s default timeout for AI Vision & Clinical Pharmacology
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let customMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.message;

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      customMessage = 'The request took longer than expected to process. Please retry or check your network connection.';
    } else if (!customMessage) {
      customMessage = error.message;
    }

    if (customMessage) {
      error.message = customMessage;
    }
    return Promise.reject(error);
  }
);

export const getHealthStatus = async (): Promise<HealthData> => {
  const response = await api.get<ApiResponse<HealthData>>('/health');
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.error?.message || 'Failed to retrieve system health');
};

export default api;
