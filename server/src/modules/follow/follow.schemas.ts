import { FollowStatus } from '@prisma/client';
import { z } from 'zod';

export const followQuerySchema = z.object({
  filter: z.nativeEnum(FollowStatus).optional(),
});

export const completeFollowSchema = z.object({
  remark: z.string().trim().max(240).optional(),
});

export const cancelFollowSchema = z.object({
  reason: z.string().trim().min(1).max(240),
});

export const followIdentifierSchema = z.string().trim().min(2).max(64);

export type FollowQuery = z.infer<typeof followQuerySchema>;
