import api from './api';
import {
  ApiResponse,
  Appointment,
  InitiateHospitalCallDTO,
  HospitalCallResponse,
  HospitalTarget,
  HospitalReception,
  CreateReceptionDTO,
  CreateDirectAppointmentDTO,
} from '../types';


export const initiateHumanHospitalCall = async (
  data: InitiateHospitalCallDTO
): Promise<HospitalCallResponse> => {
  const response = await api.post<ApiResponse<HospitalCallResponse>>(
    '/appointments/call/human',
    data
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to initiate hospital call');
};

export const initiateAIHospitalCall = async (
  data: InitiateHospitalCallDTO
): Promise<HospitalCallResponse> => {
  const response = await api.post<ApiResponse<HospitalCallResponse>>(
    '/appointments/call/ai',
    data
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to initiate AI hospital booking call');
};

export const getAppointments = async (): Promise<Appointment[]> => {
  const response = await api.get<ApiResponse<{ appointments: Appointment[] }>>(
    '/appointments'
  );
  if (response.data.success && response.data.data) {
    return response.data.data.appointments;
  }
  throw new Error(response.data.error?.message || 'Failed to retrieve appointments');
};

export const getAppointmentById = async (id: string): Promise<Appointment> => {
  const response = await api.get<ApiResponse<{ appointment: Appointment }>>(
    `/appointments/${id}`
  );
  if (response.data.success && response.data.data) {
    return response.data.data.appointment;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch appointment details');
};

export const confirmAppointment = async (
  id: string,
  patientNotes?: string
): Promise<Appointment> => {
  const response = await api.post<ApiResponse<{ appointment: Appointment }>>(
    `/appointments/${id}/confirm`,
    { patientNotes }
  );
  if (response.data.success && response.data.data) {
    return response.data.data.appointment;
  }
  throw new Error(response.data.error?.message || 'Failed to confirm appointment');
};

export const cancelAppointment = async (
  id: string,
  reason?: string
): Promise<Appointment> => {
  const response = await api.post<ApiResponse<{ appointment: Appointment }>>(
    `/appointments/${id}/cancel`,
    { reason }
  );
  if (response.data.success && response.data.data) {
    return response.data.data.appointment;
  }
  throw new Error(response.data.error?.message || 'Failed to cancel appointment');
};

export const deleteAppointment = async (id: string): Promise<void> => {
  const response = await api.delete<ApiResponse<null>>(`/appointments/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to delete appointment');
  }
};

export const getHospitalTarget = async (
  prescriptionId?: string
): Promise<HospitalTarget> => {
  const response = await api.get<ApiResponse<{ target: HospitalTarget }>>(
    '/appointments/target',
    { params: { prescriptionId } }
  );
  if (response.data.success && response.data.data) {
    return response.data.data.target;
  }
  throw new Error(response.data.error?.message || 'Failed to resolve hospital details');
};

// --- Saved Clinic Receptions ---

export const getSavedReceptions = async (): Promise<HospitalReception[]> => {
  const response = await api.get<ApiResponse<{ receptions: HospitalReception[] }>>(
    '/appointments/receptions'
  );
  if (response.data.success && response.data.data) {
    return response.data.data.receptions;
  }
  throw new Error(response.data.error?.message || 'Failed to retrieve saved clinic receptions');
};

export const createSavedReception = async (
  data: CreateReceptionDTO
): Promise<HospitalReception> => {
  const response = await api.post<ApiResponse<{ reception: HospitalReception }>>(
    '/appointments/receptions',
    data
  );
  if (response.data.success && response.data.data) {
    return response.data.data.reception;
  }
  throw new Error(response.data.error?.message || 'Failed to save clinic reception');
};

export const updateSavedReception = async (
  id: string,
  data: Partial<CreateReceptionDTO>
): Promise<HospitalReception> => {
  const response = await api.put<ApiResponse<{ reception: HospitalReception }>>(
    `/appointments/receptions/${id}`,
    data
  );
  if (response.data.success && response.data.data) {
    return response.data.data.reception;
  }
  throw new Error(response.data.error?.message || 'Failed to update clinic reception');
};

export const deleteSavedReception = async (id: string): Promise<void> => {
  const response = await api.delete<ApiResponse<null>>(`/appointments/receptions/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to remove clinic reception');
  }
};

export const createDirectAppointment = async (
  data: CreateDirectAppointmentDTO
): Promise<Appointment> => {
  const response = await api.post<ApiResponse<{ appointment: Appointment }>>(
    '/appointments',
    data
  );
  if (response.data.success && response.data.data) {
    return response.data.data.appointment;
  }
  throw new Error(response.data.error?.message || 'Failed to book appointment');
};

