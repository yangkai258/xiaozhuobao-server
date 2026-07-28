import { validateEnvironment, validateProduction } from './env';

const baseConfig = (overrides: Record<string, unknown> = {}) => ({
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/xzb',
  JWT_SECRET: 'a'.repeat(64),
  ...overrides,
});

describe('validateEnvironment', () => {
  it('passes for a development default config', () => {
    expect(() => validateEnvironment(baseConfig())).not.toThrow();
  });

  it('rejects missing DATABASE_URL', () => {
    const { DATABASE_URL, ...rest } = baseConfig();
    expect(() => validateEnvironment(rest)).toThrow();
  });

  it('rejects short JWT_SECRET', () => {
    expect(() => validateEnvironment(baseConfig({ JWT_SECRET: 'short' }))).toThrow();
  });
});

describe('validateProduction', () => {
  const prodOk = {
    NODE_ENV: 'production' as const,
    PORT: 4000,
    LOG_LEVEL: 'info' as const,
    FEATURE_AI_HOME: 'false' as const,
    RATE_LIMIT_AI: '60/60s',
    THROTTLE_TTL: 60,
    THROTTLE_LIMIT: 100,
    CORS_ORIGINS: 'https://app.example.com',
    DATABASE_URL: 'postgresql://user:pass@db:5432/xzb',
    REDIS_URL: 'redis://redis:6379',
    JWT_SECRET: 'a'.repeat(64),
    JWT_ACCESS_TTL: 900,
    JWT_REFRESH_TTL: 604800,
    STORAGE_DRIVER: 'local' as const,
    STORAGE_LOCAL_DIR: '/data',
    STORAGE_PUBLIC_BASE_URL: '/api/v1/storage/files',
    LOG_SINK: 'stdout' as const,
    HEALTH_CACHE_TTL_MS: 1000,
  };

  it('passes for a fully-set production environment', () => {
    expect(() => validateProduction(prodOk)).not.toThrow();
  });

  // ponytail: reviewer follow-up - production misconfig must surface at startup, not at
  // first request. Each missing / wrong setting throws with a clear message.
  it('throws when REDIS_URL is missing in production', () => {
    const { REDIS_URL, ...rest } = prodOk;
    expect(() => validateProduction(rest)).toThrow(/REDIS_URL/);
  });

  it('throws when CORS_ORIGINS contains localhost in production', () => {
    expect(() => validateProduction({ ...prodOk, CORS_ORIGINS: 'http://localhost:5173' })).toThrow(/localhost/);
  });

  it('throws when CORS_ORIGINS is empty in production', () => {
    expect(() => validateProduction({ ...prodOk, CORS_ORIGINS: '' })).toThrow(/CORS_ORIGINS/);
  });

  it('throws when LOG_SINK=loki but LOKI_URL is missing', () => {
    expect(() => validateProduction({ ...prodOk, LOG_SINK: 'loki' })).toThrow(/LOKI_URL/);
  });

  it('throws when JWT_SECRET is shorter than 64 chars in production', () => {
    expect(() => validateProduction({ ...prodOk, JWT_SECRET: 'a'.repeat(32) })).toThrow(/JWT_SECRET/);
  });

  it('throws when THROTTLE_LIMIT is below 60 in production', () => {
    expect(() => validateProduction({ ...prodOk, THROTTLE_LIMIT: 30 })).toThrow(/THROTTLE_LIMIT/);
  });

  it('does not run the production rules when NODE_ENV is development', () => {
    expect(() => validateProduction({ ...prodOk, NODE_ENV: 'development', REDIS_URL: undefined, CORS_ORIGINS: 'http://localhost:5173' })).not.toThrow();
  });
});
