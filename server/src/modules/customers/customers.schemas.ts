import { z } from 'zod';

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().max(100).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'code', 'name']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  filter_cat: z.string().trim().max(32).optional(),
  filter_status: z.string().trim().max(32).optional(),
});

export const customerPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  cat: z.string().trim().min(1).max(32),
  status: z.string().trim().min(1).max(32),
  contact: z.string().trim().min(1).max(120),
  addr: z.string().trim().min(1).max(240),
  regionBp: z.string().trim().max(32).optional(),
});

export const customerUpdateSchema = customerPayloadSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: '至少提供一个待更新字段' },
);

export const customerIdentifierSchema = z.string().trim().min(2).max(64);

export type CustomerQuery = z.infer<typeof customerQuerySchema>;
export type CustomerPayload = z.infer<typeof customerPayloadSchema>;
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;
