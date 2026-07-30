import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { context as otelContext, isSpanContextValid, trace } from '@opentelemetry/api';
// ponytail: v3.0.3 hardening ticket #6 - OTel logs are dynamically imported so this file still
// loads when only the api-logs package isn't installed (single-edge deployments).
type OtelLogger = { emit: (record: unknown, ctx: unknown) => void };
import { RequestContext } from './request-context';

const SERVICE_NAME = 'xzb-server';
const LEVEL_TO_LABEL: Record<LogLevel, string> = {
  log: 'info',
  error: 'error',
  warn: 'warn',
  debug: 'debug',
  verbose: 'debug',
  fatal: 'fatal',
};

interface LogRecord {
  timestamp: string;
  level: string;
  service: string;
  traceId: string;
  spanId: string;
  userId: string | null;
  route: string;
  method: string;
  latencyMs?: number;
  errorCode?: number;
  errorStack?: string;
  context: string;
  msg: string;
}

function isLogLevel(level: string): level is LogLevel {
  return level in LEVEL_TO_LABEL;
}

@Injectable()
// ponytail: JSON-on-stdout logger is enough for one instance + Loki; switch to pino only when sampling/PII scrubbing arrives.
export class StructuredLogger implements LoggerService {
  private debugEnabled = (process.env.LOG_LEVEL ?? 'info').toLowerCase() === 'debug';

  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, undefined, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  setLogLevels?(levels: LogLevel[]): void {
    this.debugEnabled = levels.includes('debug') || levels.includes('verbose');
  }

  private write(
    rawLevel: string,
    message: unknown,
    context = 'app',
    errorCode?: number,
    errorStack?: string,
  ): void {
    const level = isLogLevel(rawLevel) ? LEVEL_TO_LABEL[rawLevel] : rawLevel;
    const ctx = RequestContext.get();
    const spanContext = trace.getSpanContext(otelContext.active());
    const activeSpan = spanContext && isSpanContextValid(spanContext) ? spanContext : undefined;
    const latencyMs = ctx ? Date.now() - ctx.startTimeMs : undefined;
    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      service: SERVICE_NAME,
      traceId: activeSpan?.traceId ?? ctx?.traceId ?? 'no-trace',
      spanId: activeSpan?.spanId ?? ctx?.spanId ?? 'no-span',
      userId: ctx?.userId ?? null,
      route: ctx?.route ?? 'unknown',
      method: ctx?.method ?? 'UNKNOWN',
      context,
      msg: this.formatMessage(message),
    };
    if (latencyMs !== undefined) {
      record.latencyMs = latencyMs;
    }
    if (errorCode !== undefined) {
      record.errorCode = errorCode;
    }
    if (this.debugEnabled && errorStack) {
      record.errorStack = errorStack;
    }
    process.stdout.write(JSON.stringify(record) + '\n');
    this.emitToOtel(record);
    this.flushToLoki(record);
  }

  // ponytail: v3.0.3 hardening ticket #6 - LOG_SINK switches the output channel. stdout (default)
  // continues to write JSON to fd 1; loki buffers and POSTs via fetch every flushBatchMs or when the
  // buffer hits 50 lines. The two channels coexist; structured stdout is always on so tail/log
  // still works when Loki is reachable.
  // ponytail: reviewer follow-up - LOKI_BUFFER_MAX caps the in-memory buffer so a sustained
  // Loki outage cannot OOM the process. When the buffer is full the OLDEST line is dropped
  // (drop-oldest: trace history is less valuable than recent tail visibility). Defaults to
  // 1000 entries; tunable via LOKI_BUFFER_MAX.
  private readonly otelLogger: OtelLogger | null = null;
  private readonly lokiBuffer: string[] = [];
  private readonly lokiUrl: string | null = process.env.LOG_SINK === 'loki' ? (process.env.LOKI_URL ?? '') : null;
  private readonly lokiBufferMax: number = Number(process.env.LOKI_BUFFER_MAX ?? 1000);
  private readonly lokiInterval: NodeJS.Timeout | null = this.lokiUrl ? setInterval(() => this.flushLokiNow(), Number(process.env.LOKI_FLUSH_MS ?? 2000)) : null;
  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const otelLogs = require('@opentelemetry/api-logs');
      const candidate = otelLogs?.logs?.getLogger?.('xzb-server');
      this.otelLogger = typeof candidate?.emit === 'function' ? candidate : null;
    } catch { this.otelLogger = null; }
  }

  private emitToOtel(record: LogRecord): void {
    if (!this.otelLogger) return;
    try {
      // ponytail: route through OTel severityNumber; xzb-server uses NestJS LogLevel naming.
      const sev = record.level === 'error' ? 17 : record.level === 'warn' ? 13 : record.level === 'debug' ? 5 : 9;
      this.otelLogger.emit({
        severityNumber: sev,
        severityText: record.level,
        body: record.msg,
        attributes: {
          service: record.service,
          traceId: record.traceId,
          spanId: record.spanId,
          userId: record.userId ?? '',
          route: record.route,
          method: record.method,
          context: record.context,
          errorCode: record.errorCode ?? 0,
        },
        timestamp: record.timestamp,
      }, otelContext.active());
    } catch { /* ponytail: api-logs emit must never fail the request */ }
  }

  private flushToLoki(record: LogRecord): void {
    if (!this.lokiUrl) return;
    const line = JSON.stringify(record);
    this.pushLokiLine(line);
    if (this.lokiBuffer.length >= 50) this.flushLokiNow();
  }

  // ponytail: single insertion point - both fresh lines and retry-restore go through this so
  // the cap is enforced uniformly. drop-oldest pops the head; structured stdout remains
  // authoritative so an op tailing the container still sees every line.
  private pushLokiLine(line: string): void {
    if (this.lokiBuffer.length >= this.lokiBufferMax) {
      this.lokiBuffer.shift();
    }
    this.lokiBuffer.push(line);
  }

  private flushLokiNow(): void {
    if (!this.lokiUrl || this.lokiBuffer.length === 0) return;
    const lines = this.lokiBuffer.splice(0);
    // ponytail: Loki push format: a single stream of [ns, json] pairs.
    const now = Date.now() * 1_000_000; // nanoseconds
    const stream = { stream: { service: 'xzb-server', env: process.env.NODE_ENV ?? 'development' }, values: lines.map((l) => [String(now), l]) };
    const body = JSON.stringify({ streams: [stream] });
    fetch(this.lokiUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body }).catch(() => {
      // ponytail: drop on the floor if Loki is down - stdout JSON is still authoritative for ops.
      // Push back through the cap so the buffer can never exceed lokiBufferMax even after a
      // long-down flush.
      for (const line of lines) this.pushLokiLine(line);
    });
  }

  onApplicationShutdown(): void {
    if (this.lokiInterval) clearInterval(this.lokiInterval);
    this.flushLokiNow();
  }

  private formatMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }
    if (message instanceof Error) {
      return message.message;
    }
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
