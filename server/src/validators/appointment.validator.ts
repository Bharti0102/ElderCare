import { z } from 'zod';

export const initiateHospitalCallSchema = z.object({
  prescriptionId: z.string().optional(),
  hospital: z
    .string({ required_error: 'Hospital name is required' })
    .trim()
    .min(2, 'Hospital name must be at least 2 characters long')
    .max(120, 'Hospital name cannot exceed 120 characters'),
  doctor: z.string().trim().max(100).optional(),
  department: z.string().trim().max(80).optional(),
  receptionPhone: z
    .string({ required_error: 'Reception phone number is required' })
    .trim()
    .min(3, 'Phone number must be at least 3 digits long')
    .max(30, 'Phone number cannot exceed 30 characters'),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  patientNotes: z.string().max(500).optional(),
  isAvailable: z.boolean().optional(),
  confirmedTime: z.string().optional(),
  receptionistSpeech: z.string().max(1000).optional(),
  aiTranscript: z.string().max(3000).optional(),
});


export const confirmAppointmentSchema = z.object({
  patientNotes: z.string().max(500).optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const saveReceptionSchema = z.object({
  hospitalName: z
    .string({ required_error: 'Hospital name is required' })
    .trim()
    .min(2, 'Hospital name must be at least 2 characters long')
    .max(120, 'Hospital name cannot exceed 120 characters'),
  receptionPhone: z
    .string({ required_error: 'Reception phone number is required' })
    .trim()
    .min(3, 'Phone number must be at least 3 digits long')
    .max(30, 'Phone number cannot exceed 30 characters'),
  doctorName: z.string().trim().max(100).optional(),
  department: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  availableSlots: z.array(z.string()).optional(),
  notes: z.string().max(500).optional(),
  isFavorite: z.boolean().optional(),
});

export const createDirectAppointmentSchema = z.object({
  hospital: z.string().trim().min(2),
  receptionPhone: z.string().trim().min(3),
  doctor: z.string().trim().optional(),
  department: z.string().trim().optional(),
  requestedDate: z.string({ required_error: 'Appointment date is required' }),
  requestedTime: z.string({ required_error: 'Appointment time is required' }),
  patientNotes: z.string().max(500).optional(),
  source: z.enum(['AI_CALL', 'HUMAN_CALL', 'MANUAL']).optional(),
  status: z.enum(['PROPOSED', 'PENDING_CONFIRMATION', 'CONFIRMED']).optional(),
});

export type InitiateHospitalCallInput = z.infer<typeof initiateHospitalCallSchema>;
export type ConfirmAppointmentInput = z.infer<typeof confirmAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type SaveReceptionInput = z.infer<typeof saveReceptionSchema>;
export type CreateDirectAppointmentInput = z.infer<typeof createDirectAppointmentSchema>;

