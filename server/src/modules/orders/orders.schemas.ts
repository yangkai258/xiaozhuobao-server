import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  filter_status: z.nativeEnum(OrderStatus).optional(),
  keyword: z.string().trim().max(100).optional(),
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
});

export const createOrderSchema = z
  .object({
    customerId: z.string().trim().min(1),
    address: z.string().trim().min(1).max(240),
    expectedShipDate: dateString.optional(),
    items: z
      .array(
        z.object({
          productId: z.string().trim().min(1),
          qty: z.number().int().positive().max(1000000),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine((value) => new Set(value.items.map((item) => item.productId)).size === value.items.length, {
    message: '订单商品不可重复',
    path: ['items'],
  });

export const orderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  remark: z.string().trim().max(240).optional(),
});

export const orderIdentifierSchema = z.string().trim().min(2).max(64);

export type OrderQuery = z.infer<typeof orderQuerySchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderStatusInput = z.infer<typeof orderStatusSchema>;
