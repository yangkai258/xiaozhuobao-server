import { z } from 'zod';

export const aiModuleSchema = z.enum(['insight', 'quote', 'risk', 'after', 'kb', 'follow']);
export const toolCallTypeSchema = z.enum([
  'customer_qualification',
  'data_query',
  'kb_reply',
  'draft',
  'submit',
]);
export const attachmentKindSchema = z.enum(['image', 'file']);
export const intentHintSchema = z.enum([
  'customer_qualification',
  'data_query',
  'kb_query',
  'draft',
]);

export const attachmentSchema = z.object({
  fileId: z.string().min(1).max(128),
  kind: attachmentKindSchema,
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const invokeAiSchema = z.object({
  prompt: z.string().trim().min(1).max(8000),
  context: z.record(z.unknown()).optional(),
  attachments: z.array(attachmentSchema).max(8).optional(),
  intentHints: z.array(intentHintSchema).max(4).optional(),
});
export type AiModuleId = z.infer<typeof aiModuleSchema>;
export type ToolCallType = z.infer<typeof toolCallTypeSchema>;
export type IntentHint = z.infer<typeof intentHintSchema>;
export type InvokeAiInput = z.infer<typeof invokeAiSchema>;

// response shape used by the service + tests; intentionally untyped at runtime so
// phase-one fixtures stay flexible, but the TS surface is what the frontend reads.
export interface ToolCall {
  id: string;
  type: ToolCallType;
  args: Record<string, unknown>;
  preview?: unknown;
}
export interface Citation {
  docId: string;
  title: string;
  snippet: string;
  href?: string;
}
export interface SimilarCase {
  id: string;
  title: string;
  outcome: string;
}
export interface NextAction {
  id: string;
  label: string;
  payload?: Record<string, unknown>;
}
export interface InvokeResponse {
  reply: string;
  toolCalls: ToolCall[];
  citations: Citation[];
  similarCases: SimilarCase[];
  nextActions: NextAction[];
}
