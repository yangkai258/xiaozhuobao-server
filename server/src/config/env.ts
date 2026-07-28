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
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  return envSchema.parse(config);
}
