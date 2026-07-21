import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextValue {
  traceId: string;
  spanId: string;
  userId: string | null;
  route: string;
  method: string;
  startTimeMs: number;
}

const storage = new AsyncLocalStorage<RequestContextValue>();

export const RequestContext = {
  run<T>(value: RequestContextValue, fn: () => T): T {
    return storage.run(value, fn);
  },
  get(): RequestContextValue | undefined {
    return storage.getStore();
  },
  getOrDefault(): RequestContextValue {
    return (
      storage.getStore() ?? {
        traceId: 'no-trace',
        spanId: 'no-span',
        userId: null,
        route: 'unknown',
        method: 'UNKNOWN',
        startTimeMs: Date.now(),
      }
    );
  },
};
