import { z } from 'zod';

export const aiModuleSchema = z.enum(['insight', 'quote', 'risk', 'after', 'kb', 'follow']);

export const invokeAiSchema = z.object({
  prompt: z.string().trim().min(1).max(8000),
  context: z.record(z.unknown()).optional(),
});

export type AiModuleId = z.infer<typeof aiModuleSchema>;
export type InvokeAiInput = z.infer<typeof invokeAiSchema>;
