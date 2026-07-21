import { AftersaleReason, AftersaleStatus } from '@prisma/client';
import { z } from 'zod';

export const aftersaleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().optional(),
  filter_status: z.nativeEnum(AftersaleStatus).optional(),
});

export const createAftersaleSchema = z.object({
  orderId: z.string().trim().min(1),
  material: z.string().trim().min(1).max(240),
  reason: z.nativeEnum(AftersaleReason),
  occurredAt: z.string().datetime(),
  images: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
});

export const aftersaleIdentifierSchema = z.string().trim().min(2).max(64);

export type AftersaleQuery = z.infer<typeof aftersaleQuerySchema>;
export type CreateAftersaleInput = z.infer<typeof createAftersaleSchema>;
