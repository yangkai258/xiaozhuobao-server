import { z } from 'zod';

export const contractQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  customerId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
  filter_status: z.string().trim().optional(),
  keyword: z.string().trim().max(100).optional(),
});

export const contractPayloadSchema = z.object({
  no: z.string().trim().max(32).optional(),
  name: z.string().trim().min(1).max(160),
  customerId: z.string().trim().min(1),
  projectId: z.string().trim().optional(),
  signedBy: z.string().trim().max(160).optional(),
  status: z.string().trim().min(1).max(32),
  amtCents: z.string().regex(/^\d{1,24}$/),
  fileUrl: z.string().trim().max(500).optional(),
});

export const contractUpdateSchema = contractPayloadSchema
  .omit({ no: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: '至少提供一个待更新字段' });

export const contractIdentifierSchema = z.string().trim().min(2).max(64);

export type ContractQuery = z.infer<typeof contractQuerySchema>;
export type ContractPayload = z.infer<typeof contractPayloadSchema>;
export type ContractUpdate = z.infer<typeof contractUpdateSchema>;
