import { Prisma } from '@prisma/client';

export const activeScope = { isDeleted: false } as const;

const softDeleteModels = new Set<Prisma.ModelName>([
  'Customer',
  'Project',
  'Contract',
  'Product',
  'Order',
  'Aftersale',
  'FollowTask',
  'BizSubmission',
]);

interface MutableArgs {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export const softDeleteMiddleware: Prisma.Middleware = async (params, next) => {
  if (!params.model || !softDeleteModels.has(params.model)) {
    const result: unknown = await next(params);
    return result;
  }

  const args = (params.args ?? {}) as MutableArgs;
  params.args = args;
  if (['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
    args.where = { ...args.where, isDeleted: args.where?.isDeleted ?? false };
  } else if (params.action === 'delete') {
    params.action = 'update';
    args.data = { isDeleted: true, deletedAt: new Date() };
  } else if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    args.data = { isDeleted: true, deletedAt: new Date() };
  }
  const result: unknown = await next(params);
  return result;
};
