import { z } from 'zod';

const amountString = z.string().regex(/^\d{1,24}$/);

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  customerId: z.string().trim().optional(),
  filter_status: z.string().trim().optional(),
  keyword: z.string().trim().max(100).optional(),
});

export const projectPayloadSchema = z.object({
  no: z.string().trim().max(32).optional(),
  name: z.string().trim().min(1).max(160),
  customerId: z.string().trim().min(1),
  status: z.string().trim().min(1).max(32),
  amtCents: amountString,
});

export const projectUpdateSchema = projectPayloadSchema
  .omit({ no: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: '至少提供一个待更新字段' });

export const projectIdentifierSchema = z.string().trim().min(2).max(64);

export type ProjectQuery = z.infer<typeof projectQuerySchema>;
export type ProjectPayload = z.infer<typeof projectPayloadSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
