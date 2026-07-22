import { BizKind, BizStatus } from '@prisma/client';
import { z } from 'zod';

const centsString = z.string().regex(/^\d{1,24}$/, '金额必须是整数分字符串');
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期必须是 YYYY-MM-DD');
const customerId = z.string().trim().min(1).max(64).optional();
const remark = z.string().trim().max(500).optional();
const productItem = z.object({
  productId: z.string().trim().min(1),
  qty: z.number().int().positive(),
});

// ponytail: each kind only enforces its own shape + 整数分校验; unknown extras pass through so frontend can roll out fields safely.
const meetingSchema = z
  .object({
    customerId,
    topic: z.string().trim().min(1).max(200),
    date: dateString.optional(),
    location: z.string().trim().max(200).optional(),
    attendees: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
    agenda: z.string().trim().max(2000).optional(),
    budgetCents: centsString.optional(),
    remark,
  })
  .passthrough();

const stockingSchema = z
  .object({
    customerId,
    items: z.array(productItem).min(1).max(200),
    expectedDate: dateString.optional(),
    totalQty: z.number().int().nonnegative(),
    remark,
  })
  .passthrough();

const shipmentSchema = z
  .object({
    customerId,
    items: z.array(productItem).min(1).max(200),
    address: z.string().trim().min(1).max(500),
    plannedDate: dateString,
    carrier: z.string().trim().max(80).optional(),
    trackingNo: z.string().trim().max(80).optional(),
    remark,
  })
  .passthrough();

const advertSchema = z
  .object({
    customerId,
    channel: z.string().trim().min(1).max(80),
    periodStart: dateString,
    periodEnd: dateString,
    budgetCents: centsString,
    material: z.string().trim().max(200).optional(),
    remark,
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (value.periodStart > value.periodEnd) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['periodEnd'], message: '结束日期不能早于开始日期' });
    }
  });

const storeSchema = z
  .object({
    customerId,
    storeName: z.string().trim().min(1).max(200),
    address: z.string().trim().min(1).max(500),
    area: z.string().trim().max(80).optional(),
    storeType: z.string().trim().max(80).optional(),
    remark,
  })
  .passthrough();

const subsidySchema = z
  .object({
    customerId,
    subsidyType: z.string().trim().min(1).max(80),
    amountCents: centsString,
    periodStart: dateString,
    periodEnd: dateString.optional(),
    document: z.string().trim().max(500).optional(),
    remark,
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (value.periodEnd && value.periodStart > value.periodEnd) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['periodEnd'], message: '结束日期不能早于开始日期' });
    }
  });

const rentalSchema = z
  .object({
    customerId,
    itemName: z.string().trim().min(1).max(200),
    startDate: dateString,
    endDate: dateString,
    dailyRateCents: centsString,
    depositCents: centsString.optional(),
    remark,
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (value.startDate > value.endDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: '结束日期不能早于开始日期' });
    }
  });

const complaintSchema = z
  .object({
    customerId,
    category: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(2000),
    occurredAt: z.string().datetime(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    remark,
  })
  .passthrough();

const payloadSchemas: Record<BizKind, z.ZodTypeAny> = {
  MEETING: meetingSchema,
  STOCKING: stockingSchema,
  SHIPMENT: shipmentSchema,
  ADVERT: advertSchema,
  STORE: storeSchema,
  SUBSIDY: subsidySchema,
  RENTAL: rentalSchema,
  COMPLAINT: complaintSchema,
};

export const bizKindSchema = z.nativeEnum(BizKind);

export const bizQuerySchema = z.object({
  kind: z.nativeEnum(BizKind).optional(),
  filter_status: z.nativeEnum(BizStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export const bizStatusSchema = z.object({
  status: z.nativeEnum(BizStatus),
});

export const bizIdentifierSchema = z.string().trim().min(2).max(64);

export type BizQuery = z.infer<typeof bizQuerySchema>;
export type BizStatusInput = z.infer<typeof bizStatusSchema>;
export type BizPayloadByKind = {
  MEETING: z.infer<typeof meetingSchema>;
  STOCKING: z.infer<typeof stockingSchema>;
  SHIPMENT: z.infer<typeof shipmentSchema>;
  ADVERT: z.infer<typeof advertSchema>;
  STORE: z.infer<typeof storeSchema>;
  SUBSIDY: z.infer<typeof subsidySchema>;
  RENTAL: z.infer<typeof rentalSchema>;
  COMPLAINT: z.infer<typeof complaintSchema>;
};

export function parseBizPayload<K extends BizKind>(kind: K, value: unknown): BizPayloadByKind[K] {
  return payloadSchemas[kind].parse(value) as BizPayloadByKind[K];
}
