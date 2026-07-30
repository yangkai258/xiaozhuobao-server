// ponytail: v3.0.3 hardening ticket #4 - DI tokens for the Redis layer.
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const REDIS_ENABLED = Symbol('REDIS_ENABLED');
// ponytail: reviewer follow-up - production must use Redis. REDIS_REQUIRED is computed from
// NODE_ENV at module-init time and gates RedisService methods so the in-memory Map fallback
// cannot be the silent production path under any circumstance.
export const REDIS_REQUIRED = Symbol('REDIS_REQUIRED');
