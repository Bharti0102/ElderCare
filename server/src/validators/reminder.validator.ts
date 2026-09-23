import { z } from 'zod';

export const createReminderSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().optional(),
  category: z
    .enum(['MEDICATION', 'APPOINTMENT', 'HYDRATION', 'GENERAL'])
    .optional(),
  scheduledAt: z.coerce.date({
    required_error: 'Scheduled time is required',
    invalid_type_error: 'Invalid scheduled date format',
  }),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
});

export const updateReminderSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().optional(),
  category: z.enum(['MEDICATION', 'APPOINTMENT', 'HYDRATION', 'GENERAL']).optional(),
  scheduledAt: z.coerce.date().optional(),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'SNOOZED', 'CANCELLED']).optional(),
});

export const snoozeReminderSchema = z.object({
  minutes: z
    .number()
    .int()
    .min(1, 'Must snooze for at least 1 minute')
    .max(1440, 'Cannot snooze for more than 24 hours')
    .optional()
    .default(10),
});

export const structuredReminderToolSchema = z.object({
  action: z.enum(['CREATE', 'LIST', 'COMPLETE', 'SNOOZE', 'DELETE']).default('CREATE'),
  title: z.string().optional(),
  category: z.enum(['MEDICATION', 'APPOINTMENT', 'HYDRATION', 'GENERAL']).optional(),
  scheduledAt: z.coerce.date().optional(),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  reminderId: z.string().optional(),
  snoozeMinutes: z.number().optional().default(10),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
export type SnoozeReminderInput = z.infer<typeof snoozeReminderSchema>;
export type StructuredReminderToolInput = z.infer<typeof structuredReminderToolSchema>;
