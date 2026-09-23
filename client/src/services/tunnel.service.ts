import api from './api';

export interface TunnelStatusResponse {
  tunnel: {
    active: boolean;
    url: string | null;
    startedAt: string | null;
    error: string | null;
    binaryPath: string | null;
  };
  sms: {
    provider: string;
    configured: boolean;
    maskedApiKey: string | null;
  };
  effectiveClientUrl: string;
}

export const getTunnelStatus = async (): Promise<TunnelStatusResponse> => {
  const response = await api.get('/tunnel/status');
  return response.data.data;
};

export const startTunnel = async (): Promise<{ url: string; message: string }> => {
  const response = await api.post('/tunnel/start', { port: 5173 });
  return response.data.data;
};

export const stopTunnel = async (): Promise<void> => {
  await api.post('/tunnel/stop');
};

export const sendTestSms = async (phone: string, name?: string): Promise<any> => {
  const response = await api.post('/tunnel/test-sms', { phone, name });
  return response.data.data;
};
