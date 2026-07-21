import { z } from 'zod';

export const dictQuerySchema = z.object({
  kind: z.string().trim().min(1).max(64),
});

export type DictQuery = z.infer<typeof dictQuerySchema>;
