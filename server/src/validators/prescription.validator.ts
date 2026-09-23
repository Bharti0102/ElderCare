import { z } from 'zod';

export const medicineValidator = z.object({
  name: z.string({ required_error: 'Medicine name is required' }).trim().min(1, 'Medicine name cannot be empty'),
  dosage: z.string().trim().optional(),
  frequency: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  duration: z.string().trim().optional(),
  purpose: z.string().trim().optional(),
  timingInstructions: z.string().trim().optional(),
  precautions: z.string().trim().optional(),
  interactions: z.string().trim().optional(),
  whatToAvoid: z.string().trim().optional(),
  warnings: z.string().trim().optional(),
  simplifiedExplanation: z.string().trim().optional(),
});

export const confirmPrescriptionSchema = z.object({
  doctor: z
    .object({
      name: z.string().trim().optional(),
      specialty: z.string().trim().optional(),
    })
    .optional(),
  hospital: z
    .object({
      name: z.string().trim().optional(),
      address: z.string().trim().optional(),
    })
    .optional(),
  receptionPhone: z.string().trim().optional(),
  prescriptionDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
  medicines: z.array(medicineValidator).min(1, 'At least one medicine is required in confirmed prescription'),
});

export const createRemindersFromPrescriptionSchema = z.object({
  medicineIndices: z.array(z.number().int().nonnegative()).optional(),
  preferredTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'Time must be in HH:mm format').optional(),
  confirmDaily: z.boolean().optional(),
});

export type ConfirmPrescriptionInput = z.infer<typeof confirmPrescriptionSchema>;
export type CreateRemindersFromPrescriptionInput = z.infer<typeof createRemindersFromPrescriptionSchema>;
