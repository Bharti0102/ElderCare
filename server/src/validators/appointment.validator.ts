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
    .max(25, 'Phone number cannot exceed 25 characters'),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  patientNotes: z.string().max(500).optional(),
});

export const confirmAppointmentSchema = z.object({
  patientNotes: z.string().max(500).optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(300).optional(),
});

export type InitiateHospitalCallInput = z.infer<typeof initiateHospitalCallSchema>;
export type ConfirmAppointmentInput = z.infer<typeof confirmAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
