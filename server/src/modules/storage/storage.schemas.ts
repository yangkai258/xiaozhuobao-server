import { z } from 'zod';
import { SIGNED_URL_TTL_MAX_SECONDS, SIGNED_URL_TTL_SECONDS } from './storage.constants';

export const uploadInputSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  base64: z.string().min(1),
});

export type UploadInput = z.infer<typeof uploadInputSchema>;

export const signUrlInputSchema = z.object({
  url: z.string().min(1),
  expiresIn: z.number().int().positive().max(SIGNED_URL_TTL_MAX_SECONDS).optional(),
});

export type SignUrlInput = z.infer<typeof signUrlInputSchema>;

export const SIGNED_URL_DEFAULT_TTL = SIGNED_URL_TTL_SECONDS;
