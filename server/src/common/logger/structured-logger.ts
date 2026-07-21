import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
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
    const latencyMs = ctx ? Date.now() - ctx.startTimeMs : undefined;
    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      service: SERVICE_NAME,
      traceId: ctx?.traceId ?? 'no-trace',
      spanId: ctx?.spanId ?? 'no-span',
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
