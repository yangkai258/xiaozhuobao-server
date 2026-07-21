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
import { PrismaService } from '../../infra/prisma/prisma.service';
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

const writeMethods = new Set(['POST', 'PATCH', 'DELETE']);
const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly inFlight = new Map<string, InFlightRequest>();

  constructor(private readonly prisma: PrismaService) {}

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
    const existing = await this.prisma.idempotencyRecord.findUnique({ where: { key } });
    if (existing && existing.expiresAt > new Date()) {
      this.assertSameRequest(identity, existing);
      response.status(existing.statusCode).setHeader('Idempotent-Replay', 'true');
      return existing.responseBody;
    }

    const inFlight = this.inFlight.get(key);
    if (inFlight) {
      this.assertSameRequest(identity, inFlight);
      const result = await inFlight.promise;
      response.status(result.statusCode).setHeader('Idempotent-Replay', 'true');
      return result.data;
    }

    // ponytail: this in-process lock covers the documented single-instance phase; replace it with Redis SETNX before scaling out.
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
    const data: unknown = await firstValueFrom(next.handle() as Observable<unknown>);
    const statusCode = response.statusCode;
    await this.prisma.idempotencyRecord.upsert({
      where: { key },
      update: {
        ...identity,
        statusCode,
        responseBody: toPrismaJson(data),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      create: {
        key,
        ...identity,
        statusCode,
        responseBody: toPrismaJson(data),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return { statusCode, data };
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
