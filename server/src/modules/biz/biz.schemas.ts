import { BizKind, BizStatus } from '@prisma/client';
import { z } from 'zod';

function addMoneyIssues(value: Record<string, unknown>, context: z.RefinementCtx): void {
  for (const [key, item] of Object.entries(value)) {
    if (key.endsWith('Cents') && (typeof item !== 'string' || !/^\d{1,24}$/.test(item))) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: '金额必须是整数分字符串' });
    }
  }
}

const payloadSchema = () =>
  z
    .object({ customerId: z.string().trim().optional() })
    .passthrough()
    .superRefine(addMoneyIssues);

// ponytail: v1.1 references removed v1.0 field tables; these separate schemas enforce object and money safety until the field tables return.
const payloadSchemas: Record<BizKind, z.ZodTypeAny> = {
  MEETING: payloadSchema(),
  STOCKING: payloadSchema(),
  SHIPMENT: payloadSchema(),
  ADVERT: payloadSchema(),
  STORE: payloadSchema(),
  SUBSIDY: payloadSchema(),
  RENTAL: payloadSchema(),
  COMPLAINT: payloadSchema(),
};

export const bizKindSchema = z.nativeEnum(BizKind);

export const bizQuerySchema = z.object({
  kind: z.nativeEnum(BizKind).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export const bizStatusSchema = z.object({
  status: z.nativeEnum(BizStatus),
});

export const bizIdentifierSchema = z.string().trim().min(2).max(64);

export type BizQuery = z.infer<typeof bizQuerySchema>;
export type BizStatusInput = z.infer<typeof bizStatusSchema>;

export function parseBizPayload(kind: BizKind, value: unknown): Record<string, unknown> {
  return payloadSchemas[kind].parse(value) as Record<string, unknown>;
}
