import { createHash } from 'node:crypto';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { RedisService } from '../../infra/redis/redis.service';

function makeRedis(): RedisService {
  return {
    isEnabled: () => false,
    tryAcquireIdempotencyLock: async () => true,
    releaseIdempotencyLock: async () => undefined,
    get: async () => null,
    set: async () => undefined,
    del: async () => undefined,
    incr: async () => 1,
    assertRateLimit: async () => undefined,
  } as unknown as RedisService;
}

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('unique violation', { code: 'P2002', clientVersion: 'test' });
}

interface MockRes {
  statusCode: number;
  setHeader: jest.Mock;
  status: jest.Mock;
}

function makeRes(): MockRes {
  return {
    statusCode: 200,
    setHeader: jest.fn(),
    status: jest.fn(function (this: MockRes, c: number) { this.statusCode = c; return this; }),
  };
}

function makeContext(req: unknown, res: MockRes) {
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as never;
}

function makeReq() {
  return {
    method: 'POST',
    path: '/orders',
    header: (name: string) => (name === 'Idempotency-Key' ? '11111111-2222-4333-8444-555555555555' : undefined),
    user: { id: 'u1' },
    body: { foo: 'bar' },
  };
}

interface StoredCreateInput {
  key: string;
  statusCode: number;
  userId: string;
  method: string;
  path: string;
  bodyHash: string;
  expiresAt: Date;
}

interface IdemEntry {
  statusCode: number;
  responseBody: unknown;
  stored: StoredCreateInput;
}

describe('IdempotencyInterceptor', () => {
  it('INSERT 占位 -> 执行 -> UPDATE; 第二次请求 replay', async () => {
    const idemMap = new Map<string, IdemEntry>();
    const prisma = {
      idempotencyRecord: {
        findUnique: jest.fn((input: { where: { key: string } }) => {
          const entry = idemMap.get(input.where.key);
          if (!entry) return Promise.resolve(null);
          return Promise.resolve({ ...entry.stored, statusCode: entry.statusCode, responseBody: entry.responseBody });
        }),
        create: jest.fn((input: { data: StoredCreateInput }) => {
          if (idemMap.has(input.data.key)) return Promise.reject(p2002());
          idemMap.set(input.data.key, { statusCode: input.data.statusCode, responseBody: null, stored: input.data });
          return Promise.resolve(input.data);
        }),
        update: jest.fn((input: { where: { key: string }; data: { statusCode: number; responseBody: unknown } }) => {
          const prev = idemMap.get(input.where.key);
          if (!prev) throw new Error('missing');
          idemMap.set(input.where.key, { statusCode: input.data.statusCode, responseBody: input.data.responseBody, stored: prev.stored });
          return Promise.resolve(input.data);
        }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const interceptor = new IdempotencyInterceptor(prisma as never, makeRedis(), { recordIdempotencyReplay: jest.fn() } as never);
    const res = makeRes();

    const next1 = { handle: jest.fn(() => of({ ok: true, n: 1 })) };
    const r1 = await firstValueFrom(interceptor.intercept(makeContext(makeReq(), res), next1));
    expect(r1).toEqual({ ok: true, n: 1 });
    expect(next1.handle).toHaveBeenCalledTimes(1);
    expect(prisma.idempotencyRecord.create).toHaveBeenCalledTimes(1);
    expect(prisma.idempotencyRecord.update).toHaveBeenCalledTimes(1);

    const next2 = { handle: jest.fn(() => of({ ok: true, n: 999 })) };
    const r2 = await firstValueFrom(interceptor.intercept(makeContext(makeReq(), res), next2));
    expect(r2).toEqual({ ok: true, n: 1 });
    expect(next2.handle).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Idempotent-Replay', 'true');
  });

  it('cross-process P2002: spin-wait -> replay, downstream never runs', async () => {
    const realBodyHash = createHash('sha256').update(JSON.stringify({ foo: 'bar' })).digest('hex');
    const pending = {
      key: '11111111-2222-4333-8444-555555555555',
      userId: 'u1',
      method: 'POST',
      path: '/orders',
      bodyHash: realBodyHash,
      statusCode: -1,
      responseBody: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    const final = { ...pending, statusCode: 201, responseBody: { ok: true, fromOtherProcess: true } };
    let findCall = 0;
    const prisma = {
      idempotencyRecord: {
        create: jest.fn().mockRejectedValue(p2002()),
        findUnique: jest.fn(() => {
          findCall += 1;
          return Promise.resolve(findCall >= 2 ? final : pending);
        }),
        update: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const interceptor = new IdempotencyInterceptor(prisma as never, makeRedis(), { recordIdempotencyReplay: jest.fn() } as never);
    const res = makeRes();
    const next = { handle: jest.fn(() => of({ shouldNotRun: true })) };

    const r = await firstValueFrom(interceptor.intercept(makeContext(makeReq(), res), next));
    expect(r).toEqual({ ok: true, fromOtherProcess: true });
    expect(next.handle).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Idempotent-Replay', 'true');
    expect(prisma.idempotencyRecord.update).not.toHaveBeenCalled();
  });

  it('downstream throws -> PENDING sentinel row is deleted', async () => {
    const prisma = {
      idempotencyRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const interceptor = new IdempotencyInterceptor(prisma as never, makeRedis(), { recordIdempotencyReplay: jest.fn() } as never);
    const res = makeRes();
    res.statusCode = 500;
    const next = { handle: () => throwError(() => new Error('downstream boom')) };

    await expect(
      firstValueFrom(interceptor.intercept(makeContext(makeReq(), res), next as never)),
    ).rejects.toThrow('downstream boom');
    expect(prisma.idempotencyRecord.deleteMany).toHaveBeenCalledWith({
      where: { key: '11111111-2222-4333-8444-555555555555', statusCode: -1 },
    });
  });
});
