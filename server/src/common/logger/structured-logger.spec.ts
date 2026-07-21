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
