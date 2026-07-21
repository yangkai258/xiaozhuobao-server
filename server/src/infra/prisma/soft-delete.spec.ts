import { Prisma } from '@prisma/client';
import { softDeleteMiddleware } from './soft-delete';

function params(action: Prisma.PrismaAction, args: Record<string, unknown>): Prisma.MiddlewareParams {
  return { model: 'Customer', action, args, dataPath: [], runInTransaction: false };
}

describe('softDeleteMiddleware', () => {
  it('adds the active scope to reads', async () => {
    const input = params('findMany', { where: { status: '已生效' } });
    const next = jest.fn((value: Prisma.MiddlewareParams) => Promise.resolve(value));

    await softDeleteMiddleware(input, next);

    expect(input.args.where).toEqual({ status: '已生效', isDeleted: false });
  });

  it('turns deletes into timestamped updates', async () => {
    const input = params('delete', { where: { id: 'ck_001' } });
    const next = jest.fn((value: Prisma.MiddlewareParams) => Promise.resolve(value));

    await softDeleteMiddleware(input, next);

    expect(input.action).toBe('update');
    expect(input.args.data).toMatchObject({ isDeleted: true });
    expect(input.args.data.deletedAt).toBeInstanceOf(Date);
  });
});
