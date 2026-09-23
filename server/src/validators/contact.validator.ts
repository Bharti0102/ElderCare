import { z } from 'zod';

export const createContactSchema = z.object({
  name: z
    .string({ required_error: 'Contact name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  relationship: z
    .string({ required_error: 'Relationship is required' })
    .trim()
    .min(1, 'Relationship is required')
    .max(50, 'Relationship cannot exceed 50 characters'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .min(3, 'Phone number must be at least 3 digits long')
    .max(25, 'Phone number cannot exceed 25 characters'),
  isPrimary: z.boolean().optional().default(false),
});

export const updateContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  relationship: z
    .string()
    .trim()
    .min(1, 'Relationship is required')
    .max(50, 'Relationship cannot exceed 50 characters')
    .optional(),
  phone: z
    .string()
    .trim()
    .min(3, 'Phone number must be at least 3 digits long')
    .max(25, 'Phone number cannot exceed 25 characters')
    .optional(),
  isPrimary: z.boolean().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
