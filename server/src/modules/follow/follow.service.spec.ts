import { FollowStatus } from '@prisma/client';
import { FollowService } from './follow.service';

interface FollowTaskRow {
  id: string;
  status: FollowStatus;
  dueAt: Date;
  createdAt: Date;
}

interface PageResult {
  items: FollowTaskRow[];
  page: number;
  size: number;
  hasMore: boolean;
  nextCursor: string | null;
  summary: { total: string; pending: string; inProgress: string; done: string };
}

function makePrisma(tasks: FollowTaskRow[]) {
  return {
    followTask: {
      findMany: jest.fn((input: { cursor?: { id: string }; skip?: number; take?: number }) => {
        if (input.cursor) {
          const idx = tasks.findIndex((t) => t.id === input.cursor?.id);
          return tasks.slice(idx + 1, idx + 1 + (input.take ?? tasks.length));
        }
        const skip = input.skip ?? 0;
        return tasks.slice(skip, skip + (input.take ?? tasks.length));
      }),
      groupBy: jest.fn(() => {
        const counts = new Map<FollowStatus, number>();
        for (const t of tasks) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
        return Array.from(counts.entries()).map(([status, _count]) => ({ status, _count }));
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function row(id: string, status: FollowStatus, dueAt: string, createdAt: string): FollowTaskRow {
  return { id, status, dueAt: new Date(dueAt), createdAt: new Date(createdAt) };
}

describe('FollowService.findTodos pagination', () => {
  const tasks: FollowTaskRow[] = [
    row('t1', FollowStatus.PENDING, '2026-07-22T10:00:00.000Z', '2026-07-21T01:00:00.000Z'),
    row('t2', FollowStatus.IN_PROGRESS, '2026-07-23T10:00:00.000Z', '2026-07-21T02:00:00.000Z'),
    row('t3', FollowStatus.PENDING, '2026-07-24T10:00:00.000Z', '2026-07-21T03:00:00.000Z'),
    row('t4', FollowStatus.DONE, '2026-07-25T10:00:00.000Z', '2026-07-21T04:00:00.000Z'),
  ];

  it('returns page/size results and nextCursor when more remain', async () => {
    const prisma = makePrisma(tasks);
    const svc = new FollowService(prisma as never);
    const result = (await svc.findTodos('u1', { page: 1, size: 2, filter: undefined, cursor: undefined })) as PageResult;
    expect(result.items.map((i) => i.id)).toEqual(['t1', 't2']);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('t2');
    expect(result.page).toBe(1);
    expect(result.size).toBe(2);
  });

  it('uses cursor when provided and skips the cursor row', async () => {
    const prisma = makePrisma(tasks);
    const svc = new FollowService(prisma as never);
    const result = (await svc.findTodos('u1', { page: 1, size: 3, filter: undefined, cursor: 't2' })) as PageResult;
    expect(result.items.map((i) => i.id)).toEqual(['t3', 't4']);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    const findArgs = prisma.followTask.findMany.mock.calls[0][0];
    expect(findArgs.cursor).toEqual({ id: 't2' });
    expect(findArgs.skip).toBe(1);
  });

  it('summary counts every status regardless of pagination window', async () => {
    const prisma = makePrisma(tasks);
    const svc = new FollowService(prisma as never);
    const result = (await svc.findTodos('u1', { page: 1, size: 1, filter: undefined, cursor: undefined })) as PageResult;
    expect(result.items).toHaveLength(1);
    expect(result.summary).toEqual({ total: '4', pending: '2', inProgress: '1', done: '1' });
  });
});
