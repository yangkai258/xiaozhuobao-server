// ponytail: v3.0.3 hardening ticket #4 - DI tokens for the Redis layer.
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const REDIS_ENABLED = Symbol('REDIS_ENABLED');
