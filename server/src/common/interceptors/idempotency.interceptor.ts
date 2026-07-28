import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Response } from 'express';
import { firstValueFrom, from, Observable } from 'rxjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { MetricsService } from '../../observability/metrics.service';
import { ApiException } from '../filters/api.exception';
import { ApiRequest } from '../types';
import { stableStringify, toPrismaJson } from '../utils/stable-json';

interface RequestIdentity {
  userId: string;
  method: string;
  path: string;
  bodyHash: string;
}

interface StoredResult {
  statusCode: number;
  data: unknown;
}

interface InFlightRequest extends RequestIdentity {
  promise: Promise<StoredResult>;
}

interface StoredRecord extends RequestIdentity {
  statusCode: number;
  responseBody: unknown;
  expiresAt: Date;
}

const writeMethods = new Set(['POST', 'PATCH', 'DELETE']);
const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_SENTINEL = -1;
// ponytail: Prisma IdempotencyRecord unique-key P2002 is used in place of Redis SETNX (no ioredis dep).
// INSERT sentinel (statusCode=-1) -> run downstream -> UPDATE final result; contention spins
// 50ms x 100 ~= 5s reading the table until statusCode !== -1, then replays. Downstream failure
// deletes the sentinel so retries can take over. Ceiling: 5s spin; cross-region / slow downstream
// should switch to Postgres LISTEN/NOTIFY or Redis pub/sub.

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly inFlight = new Map<string, InFlightRequest>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<ApiRequest>();
    if (!writeMethods.has(request.method)) {
      return next.handle();
    }

    const key = request.header('Idempotency-Key');
    if (!key || !uuidV4Pattern.test(key)) {
      throw new ApiException(40004, '缺少或无效的 Idempotency-Key header', HttpStatus.BAD_REQUEST);
    }

    const identity: RequestIdentity = {
      userId: request.user?.id ?? 'anonymous',
      method: request.method,
      path: request.path,
      bodyHash: createHash('sha256').update(stableStringify(request.body)).digest('hex'),
    };
    const response = context.switchToHttp().getResponse<Response>();
    return from(this.execute(key, identity, response, next));
  }

  private async execute(
    key: string,
    identity: RequestIdentity,
    response: Response,
    next: CallHandler,
  ): Promise<unknown> {
    // ponytail: v3.0.3 hardening ticket #4 - Redis fast-path. When REDIS_URL is set, this is the
    // single source of cross-process contention. The Prisma P2002 sentinel underneath remains
    // as a fail-safe for the case where Redis is briefly unreachable.
    if (this.redis.isEnabled()) {
      const acquired = await this.redis.tryAcquireIdempotencyLock(key, TTL_MS);
      if (!acquired) {
        const stored = await this.waitForStoredResult(key);
        if (stored) {
          this.assertSameRequest(identity, stored);
          response.status(stored.statusCode).setHeader('Idempotent-Replay', 'true');
          this.recordReplay(identity.path);
          return stored.responseBody;
        }
        throw new ApiException(50301, '幂等锁等待超时', HttpStatus.SERVICE_UNAVAILABLE);
      }
    }
    const existing = await this.prisma.idempotencyRecord.findUnique({ where: { key } });
    if (existing && existing.expiresAt > new Date() && existing.statusCode !== PENDING_SENTINEL) {
      this.assertSameRequest(identity, existing);
      response.status(existing.statusCode).setHeader('Idempotent-Replay', 'true');
      this.recordReplay(identity.path);
      return existing.responseBody;
    }

    const inFlight = this.inFlight.get(key);
    if (inFlight) {
      this.assertSameRequest(identity, inFlight);
      const result = await inFlight.promise;
      response.status(result.statusCode).setHeader('Idempotent-Replay', 'true');
      this.recordReplay(identity.path);
      return result.data;
    }

    const promise = this.executeAndStore(key, identity, response, next);
    this.inFlight.set(key, { ...identity, promise });
    try {
      return (await promise).data;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async executeAndStore(
    key: string,
    identity: RequestIdentity,
    response: Response,
    next: CallHandler,
  ): Promise<StoredResult> {
    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          key,
          ...identity,
          statusCode: PENDING_SENTINEL,
          responseBody: Prisma.JsonNull,
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const stored = await this.waitForFinalResult(key);
        if (!stored) {
          throw new ApiException(50301, '幂等锁等待超时', HttpStatus.SERVICE_UNAVAILABLE);
        }
        this.assertSameRequest(identity, stored);
        response.status(stored.statusCode).setHeader('Idempotent-Replay', 'true');
        this.recordReplay(identity.path);
        return { statusCode: stored.statusCode, data: stored.responseBody };
      }
      throw e;
    }

    try {
      const data: unknown = await firstValueFrom(next.handle() as Observable<unknown>);
      const statusCode = response.statusCode;
      await this.prisma.idempotencyRecord.update({
        where: { key },
        data: {
          statusCode,
          responseBody: toPrismaJson(data),
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      });
      return { statusCode, data };
    } catch (e) {
      // ponytail: 下游失败时清理 sentinel 占位，让重试有机会接管同一 key
      await this.prisma.idempotencyRecord
        .deleteMany({ where: { key, statusCode: PENDING_SENTINEL } })
        .catch(() => undefined);
      throw e;
    } finally {
      // ponytail: ticket #4 - free the cross-process lock so retries can take over.
      if (this.redis.isEnabled()) await this.redis.releaseIdempotencyLock(key).catch(() => undefined);
    }
  }

  // ponytail: 50ms x 100 ~= 5s; polls the Prisma record while a peer process owns the Redis lock.
  private async waitForStoredResult(key: string): Promise<StoredRecord | null> {
    for (let i = 0; i < 100; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      // eslint-disable-next-line no-await-in-loop
      const record = await this.prisma.idempotencyRecord.findUnique({ where: { key } });
      if (record && record.statusCode !== PENDING_SENTINEL && record.expiresAt > new Date()) {
        return record;
      }
    }
    return null;
  }

  // ponytail: 50ms x 100 ~= 5s 上限；慢下游/跨区换 listen/notify 或 Redis pub/sub
  private async waitForFinalResult(key: string): Promise<StoredRecord | null> {
    for (let i = 0; i < 100; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      // eslint-disable-next-line no-await-in-loop
      const record = await this.prisma.idempotencyRecord.findUnique({ where: { key } });
      if (!record || record.expiresAt <= new Date()) {
        return null;
      }
      if (record.statusCode !== PENDING_SENTINEL) {
        return record;
      }
    }
    return null;
  }

  private recordReplay(endpoint: string): void {
    try {
      this.metrics.recordIdempotencyReplay(endpoint);
    } catch {
      // ponytail: metrics must never break a request; structured logger already carries the replay signal.
    }
  }

  private assertSameRequest(identity: RequestIdentity, stored: RequestIdentity): void {
    if (
      identity.userId !== stored.userId ||
      identity.method !== stored.method ||
      identity.path !== stored.path ||
      identity.bodyHash !== stored.bodyHash
    ) {
      throw new ApiException(10422, 'Idempotency-Key 已用于其他请求', HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }
}
