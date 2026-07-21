import { z } from 'zod';

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().max(100).optional(),
  filter_cat: z.string().trim().optional(),
  active: z.coerce.boolean().optional(),
});

export const stockAdjustmentSchema = z.object({
  stockDelta: z.number().int().min(-1000000).max(1000000).refine((value) => value !== 0),
  remark: z.string().trim().min(1).max(240),
});

export const productIdentifierSchema = z.string().trim().min(2).max(64);

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;
