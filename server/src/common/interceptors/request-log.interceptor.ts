import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { context as otelContext, isSpanContextValid, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Observable, catchError, throwError } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { MetricsService } from '../../observability/metrics.service';
import { ApiRequest } from '../types';
import { StructuredLogger } from '../logger/structured-logger';
import { RequestContext } from '../logger/request-context';

const tracer = trace.getTracer('xzb-server', '1.0.0');

@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: StructuredLogger,
    private readonly metrics: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<ApiRequest>();
    const response = http.getResponse<Response>();
    const route = this.extractRoute(request);
    const span = tracer.startSpan(`${request.method} ${route}`, {
      kind: SpanKind.SERVER,
      attributes: { 'http.request.method': request.method, 'http.route': route, 'url.path': request.path },
    });
    const activeContext = trace.setSpan(otelContext.active(), span);
    const spanContext = span.spanContext();
    const hasValidSpan = isSpanContextValid(spanContext);
    if (hasValidSpan) {
      request.traceId = spanContext.traceId;
      response.setHeader('X-Trace-Id', request.traceId);
    }
    const ctx = {
      traceId: request.traceId ?? 'no-trace',
      spanId: hasValidSpan ? spanContext.spanId : randomBytes(8).toString('hex'),
      userId: request.user?.id ?? null,
      route,
      method: request.method,
      startTimeMs: Date.now(),
    };
    return RequestContext.run(ctx, () =>
      otelContext.with(activeContext, () => {
        this.logger.log(
          `request.start ${ctx.method} ${ctx.route}`,
          context.getClass()?.name ?? 'http',
        );
        return next.handle().pipe(
        tap(() => {
          otelContext.with(activeContext, () => RequestContext.run(ctx, () => {
            span.setAttribute('http.response.status_code', response.statusCode);
          span.setStatus({ code: response.statusCode >= 400 ? SpanStatusCode.ERROR : SpanStatusCode.OK });
          this.recordMetric(ctx.route, ctx.method, response.statusCode, Date.now() - ctx.startTimeMs);
          this.logger.log(
            `request.end ${ctx.method} ${ctx.route} ${response.statusCode}`,
            context.getClass()?.name ?? 'http',
          );
            }));
          }),
        catchError((error: unknown) => {
          return otelContext.with(activeContext, () => RequestContext.run(ctx, () => {
          span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
          span.setAttribute('http.response.status_code', response.statusCode >= 400 ? response.statusCode : 500);
          const code = this.resolveErrorCode(error);
          const status = response.statusCode && response.statusCode >= 400 ? response.statusCode : 500;
          this.recordMetric(ctx.route, ctx.method, status, Date.now() - ctx.startTimeMs);
          this.logger.error(
            `request.fail ${ctx.method} ${ctx.route} ${code}`,
            error instanceof Error ? error.stack : undefined,
            context.getClass()?.name ?? 'http',
          );
          return throwError(() => error);
          }));
        }),
          finalize(() => span.end()),
        );
      }),
    );
  }

  private recordMetric(route: string, method: string, status: number, durationMs: number): void {
    try {
      this.metrics.recordHttpRequest({
        method,
        route,
        status,
        durationSeconds: durationMs / 1000,
      });
    } catch {
      // ponytail: metrics must never break a request; swallow and let the structured logger carry diagnostics.
    }
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
