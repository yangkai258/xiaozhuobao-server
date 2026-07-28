import { StructuredLogger } from './structured-logger';
import { RequestContext } from './request-context';

describe('StructuredLogger', () => {
  let stdoutSpy: jest.SpyInstance;
  let logger: StructuredLogger;

  beforeEach(() => {
    logger = new StructuredLogger();
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  function lastLine(): Record<string, unknown> {
    const calls = stdoutSpy.mock.calls as Array<[string]>;
    const last = calls[calls.length - 1]?.[0] ?? '{}';
    return JSON.parse(last) as Record<string, unknown>;
  }

  it('emits JSON with BACKEND.md 13.1 fields outside a request', () => {
    logger.log('hello world', 'TestCtx');
    const record = lastLine();
    expect(record).toMatchObject({
      level: 'info',
      service: 'xzb-server',
      traceId: 'no-trace',
      spanId: 'no-span',
      userId: null,
      route: 'unknown',
      method: 'UNKNOWN',
      context: 'TestCtx',
      msg: 'hello world',
    });
    expect(typeof record.timestamp).toBe('string');
  });

  it('inherits traceId/spanId/userId/route/method and latencyMs from RequestContext', () => {
    RequestContext.run(
      {
        traceId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        spanId: 'abcdef0123456789',
        userId: 'u_001',
        route: '/api/v1/dicts',
        method: 'GET',
        startTimeMs: Date.now() - 12,
      },
      () => logger.log('inside request', 'DictsController'),
    );
    const record = lastLine();
    expect(record).toMatchObject({
      level: 'info',
      service: 'xzb-server',
      traceId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      spanId: 'abcdef0123456789',
      userId: 'u_001',
      route: '/api/v1/dicts',
      method: 'GET',
      context: 'DictsController',
      msg: 'inside request',
    });
    expect(typeof record.latencyMs).toBe('number');
    expect((record.latencyMs as number) >= 0).toBe(true);
  });

  it('records errorCode and omits errorStack at info level', () => {
    logger.error('boom', 'Error: boom\n  at /x', 'ApiExceptionFilter');
    const record = lastLine();
    expect(record.level).toBe('error');
    expect(record.errorStack).toBeUndefined();
  });

  // ponytail: v3.0.3 hardening ticket #6 - LOG_SINK=loki buffers lines and POSTs to /push.
  it('mirrors JSON lines to Loki via fetch when LOG_SINK=loki is set', async () => {
    const originalSink = process.env.LOG_SINK;
    const originalUrl = process.env.LOKI_URL;
    process.env.LOG_SINK = 'loki';
    process.env.LOKI_URL = 'http://loki.test/loki/api/v1/push';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as unknown as Response);
    const lokiLogger = new StructuredLogger();
    lokiLogger.log('loki line 1', 'LokiCtx');
    lokiLogger.log('loki line 2', 'LokiCtx');
    lokiLogger.onApplicationShutdown();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = (fetchSpy.mock.calls[0]?.[0] as string) ?? '';
    expect(url).toBe('http://loki.test/loki/api/v1/push');
    const body = JSON.parse((fetchSpy.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.streams).toHaveLength(1);
    expect(body.streams[0].stream.service).toBe('xzb-server');
    expect(body.streams[0].values).toHaveLength(2);
    fetchSpy.mockRestore();
    if (originalSink === undefined) delete process.env.LOG_SINK; else process.env.LOG_SINK = originalSink;
    if (originalUrl === undefined) delete process.env.LOKI_URL; else process.env.LOKI_URL = originalUrl;
  });
  it('includes errorStack when LOG_LEVEL=debug', () => {
    const original = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'debug';
    const debugLogger = new StructuredLogger();
    debugLogger.error('boom', 'Error: boom\n  at /x', 'ApiExceptionFilter');
    process.env.LOG_LEVEL = original;
    const record = lastLine();
    expect(record.errorStack).toBe('Error: boom\n  at /x');
  });
});
