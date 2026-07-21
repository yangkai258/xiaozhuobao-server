import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

interface CachePolicy {
  visibility: 'private' | 'public';
  maxAge: number;
  sMaxAge?: number;
}

const ROUTE_POLICIES: Array<{ pattern: RegExp; policy: CachePolicy }> = [
  { pattern: /^\/api\/v1\/dicts/, policy: { visibility: 'public', maxAge: 300, sMaxAge: 600 } },
  { pattern: /^\/api\/v1\/me/, policy: { visibility: 'private', maxAge: 60 } },
  { pattern: /^\/api\/v1\/ai\/modules$/, policy: { visibility: 'private', maxAge: 60 } },
  { pattern: /^\/api\/v1\/health$/, policy: { visibility: 'public', maxAge: 30 } },
];

const FALLBACK_POLICY: CachePolicy = { visibility: 'private', maxAge: 60 };

// ponytail: response-level Cache-Control is best-effort; once Redis lands, swap to a server cache + ETag.
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    if (request.method !== 'GET') {
      return next.handle();
    }
    const policy = this.resolvePolicy(request.path);
    response.setHeader(
      'Cache-Control',
      `${policy.visibility}, max-age=${policy.maxAge}${policy.sMaxAge ? `, s-maxage=${policy.sMaxAge}` : ''}`,
    );
    return next.handle();
  }

  private resolvePolicy(path: string): CachePolicy {
    return ROUTE_POLICIES.find((entry) => entry.pattern.test(path))?.policy ?? FALLBACK_POLICY;
  }
}
