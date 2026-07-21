import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Observable, catchError, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiRequest } from '../types';
import { StructuredLogger } from '../logger/structured-logger';
import { RequestContext } from '../logger/request-context';

@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<ApiRequest>();
    const response = http.getResponse<Response>();
    const spanId = randomBytes(8).toString('hex');
    const ctx = {
      traceId: request.traceId ?? 'no-trace',
      spanId,
      userId: request.user?.id ?? null,
      route: this.extractRoute(request),
      method: request.method,
      startTimeMs: Date.now(),
    };
    this.logger.log(
      `request.start ${ctx.method} ${ctx.route}`,
      context.getClass()?.name ?? 'http',
    );
    return RequestContext.run(ctx, () =>
      next.handle().pipe(
        tap(() => {
          this.logger.log(
            `request.end ${ctx.method} ${ctx.route} ${response.statusCode}`,
            context.getClass()?.name ?? 'http',
          );
        }),
        catchError((error: unknown) => {
          const code = this.resolveErrorCode(error);
          this.logger.error(
            `request.fail ${ctx.method} ${ctx.route} ${code}`,
            error instanceof Error ? error.stack : undefined,
            context.getClass()?.name ?? 'http',
          );
          return throwError(() => error);
        }),
      ),
    );
  }

  private extractRoute(request: ApiRequest): string {
    const route = (request as { route?: { path?: unknown } }).route;
    return typeof route?.path === 'string' ? route.path : request.path ?? 'unknown';
  }

  private resolveErrorCode(error: unknown): number {
    if (typeof error === 'object' && error && 'code' in error && typeof (error as { code: unknown }).code === 'number') {
      return (error as { code: number }).code;
    }
    return 0;
  }
}
