import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const baseConfig = (overrides: Record<string, unknown> = {}) => ({
    get: (k: string) => (overrides[k] ?? (k === 'HEALTH_CACHE_TTL_MS' ? '1000' : undefined)),
  });

  function makePrisma(ok: boolean) {
    return { $queryRaw: ok ? jest.fn().mockResolvedValue(1) : jest.fn().mockRejectedValue(new Error('db down')) } as any;
  }

  function makeRedis(enabled: boolean, required = false) {
    return {
      isEnabled: () => enabled,
      isRequired: () => required,
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue('ok'),
    } as any;
  }

  it('returns 200 with db=ok and redis=skipped when Redis is not configured (dev/test)', async () => {
    const svc = new HealthService(makePrisma(true), makeRedis(false, false), baseConfig() as any);
    const r = await svc.readiness();
    expect(r).toEqual({ ok: true, db: 'ok', redis: 'skipped' });
  });

  // ponytail: reviewer follow-up - production deployment without REDIS_URL must surface as
  // 'down' so k8s takes the pod out of rotation. Readiness probe throws 503.
  it('throws ServiceUnavailableException when production is missing REDIS_URL', async () => {
    const svc = new HealthService(makePrisma(true), makeRedis(false, true), baseConfig() as any);
    await expect(svc.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws ServiceUnavailableException when the DB is down', async () => {
    const svc = new HealthService(makePrisma(false), makeRedis(false, false), baseConfig() as any);
    await expect(svc.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('liveness is always 200 with uptime', () => {
    const svc = new HealthService(makePrisma(true), makeRedis(false, false), baseConfig() as any);
    expect(svc.liveness()).toMatchObject({ ok: true });
    expect(typeof svc.liveness().uptimeSeconds).toBe('number');
  });

  it('caches successful readiness for HEALTH_CACHE_TTL_MS', async () => {
    const prisma = makePrisma(true);
    const redis = makeRedis(false, false);
    const svc = new HealthService(prisma, redis, baseConfig() as any);
    await svc.readiness();
    await svc.readiness();
    // only the first call hits Prisma (cache hit on the second).
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
