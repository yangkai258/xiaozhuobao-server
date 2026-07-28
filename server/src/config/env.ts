import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  FEATURE_AI_HOME: z.enum(['true', 'false']).default('false'),
  RATE_LIMIT_AI: z.string().regex(/^[1-9]\d*\/[1-9]\d*(ms|s|m)$/).default('60/60s'),
  // ponytail: v3.0.3 hardening ticket #1 - global throttler window (seconds) and per-IP request cap.
  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604800),
  STORAGE_DRIVER: z.enum(['local', 'cos', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage-data'),
  STORAGE_PUBLIC_BASE_URL: z.string().default('/api/v1/storage/files'),
  // ponytail: v3.0.3 hardening ticket #6 - structured-logger log sink. 'stdout' (default)
  // keeps the existing JSON-on-fd-1 contract; 'loki' mirrors every line to a Loki HTTP push.
  // LOKI_URL is the full /loki/api/v1/push endpoint; LOKI_FLUSH_MS controls the buffer flush
  // cadence (default 2000ms); LOKI_BUFFER_MAX caps the in-memory buffer (default 1000).
  LOG_SINK: z.enum(['stdout', 'loki']).default('stdout'),
  LOKI_URL: z.string().url().optional(),
  LOKI_FLUSH_MS: z.coerce.number().int().positive().default(2000),
  LOKI_BUFFER_MAX: z.coerce.number().int().positive().default(1000),
  HEALTH_CACHE_TTL_MS: z.coerce.number().int().positive().default(1000),
});

export type Environment = z.infer<typeof envSchema>;

// ponytail: reviewer follow-up - production-only invariants. Outside of production the dev
// defaults (Map fallback, localhost CORS, etc.) are allowed; in production these become
// hard errors so a misconfigured deployment fails fast at startup instead of silently
// downgrading the security posture.
export function validateProduction(env: Environment): void {
  if (env.NODE_ENV !== 'production') return;
  const errors: string[] = [];
  if (!env.REDIS_URL) {
    errors.push('REDIS_URL is required in production (in-memory Map fallback is forbidden; ticket #4 hardening).');
  }
  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  if (origins.length === 0) {
    errors.push('CORS_ORIGINS must list at least one origin in production.');
  }
  if (origins.some((o) => o.startsWith('http://localhost') || o.startsWith('http://127.0.0.1'))) {
    errors.push('CORS_ORIGINS must not include localhost in production (ticket #3 hardening).');
  }
  if (env.LOG_SINK === 'loki' && !env.LOKI_URL) {
    errors.push('LOG_SINK=loki requires LOKI_URL.');
  }
  if (env.JWT_SECRET.length < 64) {
    errors.push('JWT_SECRET must be at least 64 characters in production (HS256 needs the entropy).');
  }
  if (env.THROTTLE_LIMIT < 60) {
    errors.push('THROTTLE_LIMIT must be at least 60 in production (5 req/sec floor; ticket #1 hardening).');
  }
  if (errors.length > 0) {
    throw new Error('Production environment validation failed:\n  - ' + errors.join('\n  - '));
  }
}

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const env = envSchema.parse(config);
  validateProduction(env);
  return env;
}
