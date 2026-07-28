import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { json, urlencoded } from 'express';
import { PrismaService } from '../src/infra/prisma/prisma.service';

// ponytail: v3.0.3 hardening ticket #1 - global + path-level throttler must surface 20428 / 20429.
// In-memory storage (default) makes the test deterministic; ticket #4 will swap to Redis.
// THROTTLE_LIMIT is held low (3) so the test stays under 1 second.
describe('Throttler (v3.0.3 #1)', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '604800';
    process.env.STORAGE_LOCAL_DIR = tmpdir() + '/xzb-throttler-' + Date.now();
    process.env.STORAGE_PUBLIC_BASE_URL = '/api/v1/storage/files';
    // 3 req/min/IP keeps the 4th-request assertion fast and deterministic.
    process.env.THROTTLE_TTL = '60';
    process.env.THROTTLE_LIMIT = '3';

    // ponytail: ticket #7 - HealthService probes Prisma; give it a fake that answers SELECT 1.
        const fakePrisma = {
          $queryRaw: jest.fn().mockResolvedValue(1),
        } as unknown as PrismaService;
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(fakePrisma)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    const bodyLimit = process.env.STORAGE_HTTP_BODY_LIMIT ?? '15mb';
    app.use(json({ limit: bodyLimit }));
    app.use(urlencoded({ limit: bodyLimit, extended: false }));
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 20428 on the 4th /health request within the global window', async () => {
    const ok = await request(httpServer).get('/api/v1/health').expect(200);
    expect(ok.body.data?.status).toBe('ok');
    await request(httpServer).get('/api/v1/health').expect(200);
    await request(httpServer).get('/api/v1/health').expect(200);
    const blocked = await request(httpServer).get('/api/v1/health').expect(429);
    expect(blocked.body.code).toBe(20428);
  });

  it('throttler windows are independent per route override', async () => {
    // /auth/login is configured to 5/min by the @Throttle decorator; under our global cap of 3,
    // the path-level cap should still allow 5 requests before throttling (decorators win over
    // the global throttler when the override is more permissive).
    for (let i = 0; i < 5; i++) {
      const res = await request(httpServer).post('/api/v1/auth/login').send({});
      // bad request body returns 40000 from the ZodValidationPipe; that is fine, we just want
      // to observe the throttler does NOT cut us off under 5 attempts.
      expect([200, 400, 401, 40000, 40100]).toContain(res.status);
    }
  });
});
