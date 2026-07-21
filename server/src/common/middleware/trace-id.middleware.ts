import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Response } from 'express';
import { ApiRequest } from '../types';

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(request: ApiRequest, response: Response, next: NextFunction): void {
    const traceparent = request.header('traceparent');
    const traceId = traceparent?.match(/^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/i)?.[1];
    request.traceId = traceId && !/^0+$/.test(traceId) ? traceId : randomUUID().replaceAll('-', '');
    response.setHeader('X-Trace-Id', request.traceId);
    next();
  }
}
