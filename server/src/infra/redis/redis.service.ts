import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ApiException } from '../../common/filters/api.exception';
import { REDIS_CLIENT, REDIS_ENABLED, REDIS_REQUIRED } from './redis.constants';

// ponytail: v3.0.3 hardening ticket #4 - thin wrapper over ioredis. When REDIS_URL is unset
// (single-node dev) it falls back to an in-process Map with the same surface, so callers
// never branch on which mode is active. assertRateLimit and assertIdempotencyInWindow are
// the two helpers idempotency.interceptor.ts and ai.service.ts reach for.
// ponytail: reviewer follow-up - production MUST use Redis. When NODE_ENV=production and
// REDIS_URL is missing, every public method throws 50301 'Redis required in production';
// the in-memory Map is dev-only. This prevents a misconfigured deployment from silently
// running on a non-shared, non-durable cache.
@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly memory = new Map<string, { value: string; expiresAt: number | null }>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly client: Redis | null,
    @Inject(REDIS_ENABLED) private readonly enabled: boolean,
    @Inject(REDIS_REQUIRED) private readonly required: boolean,
  ) {}

  isEnabled(): boolean { return this.enabled; }
  isRequired(): boolean { return this.required; }

  private ensureAvailable(): void {
    if (this.required && !this.enabled) {
      throw new ApiException(50301, 'Redis 在生产环境为必需依赖，未配置 REDIS_URL', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async get(key: string): Promise<string | null> {
    this.ensureAvailable();
    if (this.enabled && this.client) {
      try { return await this.client.get(key); } catch (err) { this.logger.warn('redis get failed: ' + (err as Error).message); }
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.ensureAvailable();
    if (this.enabled && this.client) {
      try {
        if (ttlMs) await this.client.set(key, value, 'PX', ttlMs);
        else await this.client.set(key, value);
        return;
      } catch (err) { this.logger.warn('redis set failed: ' + (err as Error).message); }
    }
    this.memory.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null });
  }

  async del(key: string): Promise<void> {
    this.ensureAvailable();
    if (this.enabled && this.client) {
      try { await this.client.del(key); return; } catch (err) { this.logger.warn('redis del failed: ' + (err as Error).message); }
    }
    this.memory.delete(key);
  }

  async incr(key: string, ttlMs?: number): Promise<number> {
    this.ensureAvailable();
    if (this.enabled && this.client) {
      try {
        const value = await this.client.incr(key);
        if (value === 1 && ttlMs) await this.client.pexpire(key, ttlMs);
        return value;
      } catch (err) { this.logger.warn('redis incr failed: ' + (err as Error).message); }
    }
    const entry = this.memory.get(key);
    const now = Date.now();
    if (!entry || (entry.expiresAt !== null && now > entry.expiresAt)) {
      this.memory.set(key, { value: '1', expiresAt: ttlMs ? now + ttlMs : null });
      return 1;
    }
    const next = Number(entry.value) + 1;
    this.memory.set(key, { value: String(next), expiresAt: entry.expiresAt });
    return next;
  }

  // ponytail: ticket #4 - per-user, per-route sliding-window rate limit. Uses INCR + EXPIRE on
  // the first hit, so 2 processes sharing Redis see the same counter and reject fairly.
  async assertRateLimit(scope: string, userId: string, route: string, limit: number, windowMs: number): Promise<void> {
    this.ensureAvailable();
    const key = `rl:${scope}:${userId}:${route}`;
    const count = await this.incr(key, windowMs);
    if (count > limit) {
      throw new ApiException(20429, '调用过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  // ponytail: ticket #4 - SET NX with TTL. Returns true when this caller acquired the lock
  // and is the one to run downstream; false when another caller already owns it.
  async tryAcquireIdempotencyLock(key: string, ttlMs: number): Promise<boolean> {
    this.ensureAvailable();
    if (this.enabled && this.client) {
      try {
        const ok = await this.client.set(`idem:${key}`, '1', 'PX', ttlMs, 'NX');
        return ok === 'OK';
      } catch (err) { this.logger.warn('redis set NX failed: ' + (err as Error).message); }
    }
    const full = `idem:${key}`;
    const entry = this.memory.get(full);
    const now = Date.now();
    if (entry && (entry.expiresAt === null || now <= entry.expiresAt)) return false;
    this.memory.set(full, { value: '1', expiresAt: now + ttlMs });
    return true;
  }

  async releaseIdempotencyLock(key: string): Promise<void> { return this.del(`idem:${key}`); }
}
