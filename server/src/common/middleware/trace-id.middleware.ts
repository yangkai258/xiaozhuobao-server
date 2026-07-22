import { Injectable, NestMiddleware } from '@nestjs/common';
import { context, isSpanContextValid, propagation, trace } from '@opentelemetry/api';
import { randomUUID } from 'node:crypto';
import { NextFunction, Response } from 'express';
import { ApiRequest } from '../types';

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(request: ApiRequest, response: Response, next: NextFunction): void {
    const extracted = propagation.extract(context.active(), request, {
      get: (carrier, key) => carrier.header(key),
      keys: (carrier) => Object.keys(carrier.headers),
    });
    const extractedSpanContext = trace.getSpanContext(extracted);
    const traceparent = request.header('traceparent');
    const fallbackTraceId = traceparent?.match(/^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/i)?.[1];
    request.traceId = extractedSpanContext && isSpanContextValid(extractedSpanContext)
      ? extractedSpanContext.traceId
      : fallbackTraceId && !/^0+$/.test(fallbackTraceId)
        ? fallbackTraceId
        : randomUUID().replaceAll('-', '');
    response.setHeader('X-Trace-Id', request.traceId);
    context.with(extracted, next);
  }
}
