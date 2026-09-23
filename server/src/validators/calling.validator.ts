import { z } from 'zod';

export const initiateCaregiverCallSchema = z.object({
  contactId: z.string().trim().optional(),
  relationship: z.string().trim().optional(),
  name: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export const updateCallStatusSchema = z.object({
  status: z.enum([
    'REQUESTED',
    'CALLING',
    'CONNECTED',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
  ]),
  durationSeconds: z.number().int().nonnegative().optional(),
  notes: z.string().trim().optional(),
});

export type InitiateCaregiverCallInput = z.infer<
  typeof initiateCaregiverCallSchema
>;
export type UpdateCallStatusInput = z.infer<typeof updateCallStatusSchema>;
