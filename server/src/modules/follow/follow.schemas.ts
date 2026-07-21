import { FollowStatus } from '@prisma/client';
import { z } from 'zod';

export const followQuerySchema = z.object({
  filter: z.nativeEnum(FollowStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().optional(),
});

export const completeFollowSchema = z.object({
  remark: z.string().trim().max(240).optional(),
});

export const cancelFollowSchema = z.object({
  reason: z.string().trim().min(1).max(240),
});

export const followIdentifierSchema = z.string().trim().min(2).max(64);

export type FollowQuery = z.infer<typeof followQuerySchema>;
