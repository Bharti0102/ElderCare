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

export type PrescriptionStatus = 'UPLOADED' | 'ANALYZED' | 'CONFIRMED' | 'REJECTED';

export interface PrescriptionMedicine {
  _id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  duration?: string;
}

export interface Prescription {
  _id: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  doctor?: {
    name?: string;
    specialty?: string;
  };
  hospital?: {
    name?: string;
    address?: string;
  };
  receptionPhone?: string;
  prescriptionDate?: string;
  medicines: PrescriptionMedicine[];
  rawText?: string;
  confidence: number;
  status: PrescriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmPrescriptionDTO {
  doctor?: {
    name?: string;
    specialty?: string;
  };
  hospital?: {
    name?: string;
    address?: string;
  };
  receptionPhone?: string;
  prescriptionDate?: string;
  medicines: PrescriptionMedicine[];
}

export interface CreateRemindersFromPrescriptionDTO {
  medicineIndices?: number[];
  preferredTime?: string;
}

export type CallType = 'CAREGIVER' | 'HOSPITAL';
export type CallStatus =
  | 'REQUESTED'
  | 'CALLING'
  | 'CONNECTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface Call {
  _id: string;
  userId: string;
  contactId?: string;
  contactName: string;
  relationship: string;
  phoneNumber: string;
  type: CallType;
  providerCallId: string;
  status: CallStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateCallDTO {
  contactId?: string;
  relationship?: string;
  name?: string;
  message?: string;
  callType?: 'VOICE' | 'VIDEO';
}

export type AppointmentStatus =
  | 'PROPOSED'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export type AppointmentSource = 'AI_CALL' | 'HUMAN_CALL' | 'MANUAL';

export interface Appointment {
  _id: string;
  userId: string;
  prescriptionId?: string;
  callId?: string;
  hospital: string;
  doctor?: string;
  department?: string;
  receptionPhone: string;
  requestedDate: string;
  requestedTime: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  aiTranscript?: string;
  aiNotes?: string;
  patientNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateHospitalCallDTO {
  prescriptionId?: string;
  hospital: string;
  doctor?: string;
  department?: string;
  receptionPhone: string;
  preferredDate?: string;
  preferredTime?: string;
  patientNotes?: string;
}

export interface HospitalCallResponse {
  call: Call;
  appointment?: Appointment;
  mode: 'HUMAN_CALL' | 'AI_CALL';
  aiTranscript?: string;
  summary: string;
}

export interface HospitalTarget {
  hospital: string;
  doctor?: string;
  receptionPhone: string;
  prescriptionId?: string;
}

export interface VoiceProcessResponse {
  reply: string;
  transcript: string;
  spokenText: string;
  intent: string;
  confidence: number;
  suggestions: string[];
  toolResults?: any[];
  voiceSettings?: {
    rate: number;
    pitch: number;
    volume: number;
  };
}
