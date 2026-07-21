import { z } from 'zod';

export const reportQuerySchema = z.object({
  period: z.enum(['WEEK', 'MONTH', 'QUARTER', 'YEAR']).default('MONTH'),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
