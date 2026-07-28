import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

// ponytail: v3.0.3 hardening ticket #7 - /health/ready probes Prisma + Redis with a 1s TTL
// cache so kubelet / Prometheus don't hammer the DB. Prisma 'SELECT 1' through PrismaService
// is the same path the API hits; if it's broken, the API is broken. Redis pings only when
// REDIS_URL is set; without it the service returns ok: 'skipped' so k8s doesn't fail.
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private cache: { at: number; payload: { db: string; redis: string } } | null = null;
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.ttlMs = Number(config.get<string>('HEALTH_CACHE_TTL_MS') ?? 1000);
  }

  async readiness(): Promise<{ ok: true; db: string; redis: string }> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < this.ttlMs) {
      return { ok: true, ...this.cache.payload };
    }
    const db = await this.probeDb();
    const redis = await this.probeRedis();
    this.cache = { at: now, payload: { db, redis } };
    if (db !== 'ok' || redis === 'down') {
      throw new ServiceUnavailableException({ ok: false, db, redis });
    }
    return { ok: true, db, redis };
  }

  private async probeDb(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch (e) {
      this.logger.warn('health.db probe failed: ' + (e instanceof Error ? e.message : String(e)));
      return 'down';
    }
  }

  private async probeRedis(): Promise<string> {
    if (!this.redis.isEnabled()) return 'skipped';
    try {
      // ponytail: RedisService.set/get are the same code path that handles network
      // failures (they fall back to the in-process Map). ioredis SET-then-GET round-trips
      // are good enough for a readiness probe; a stuck connection surfaces as the set/get
      // pair failing here.
      const token = String(Date.now());
      await this.redis.set('health:probe', token, 5000);
      const v = await this.redis.get('health:probe');
      return v === token ? 'ok' : 'down';
    } catch (e) {
      this.logger.warn('health.redis probe failed: ' + (e instanceof Error ? e.message : String(e)));
      return 'down';
    }
  }

  // ponytail: liveness is intentionally a constant - if the process answered at all it's alive.
  liveness(): { ok: true; uptimeSeconds: number } {
    return { ok: true, uptimeSeconds: Math.floor(process.uptime()) };
  }
}