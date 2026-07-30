import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { hashPassword } from '../src/modules/auth/password';
import { PrismaService } from '../src/infra/prisma/prisma.service';

interface TestUser {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  region: string | null;
  isActive: boolean;
  refreshTokenHash: string | null;
  refreshTokenExpires: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

interface Envelope<T> {
  code: number;
  data: T;
  msg: string;
  traceId: string;
}

interface IdempotencyRecordValue {
  key: string;
  userId: string;
  method: string;
  path: string;
  bodyHash: string;
  statusCode: number;
  responseBody: unknown;
  createdAt: Date;
  expiresAt: Date;
}

describe('App API', () => {
  let app: INestApplication;
  let httpServer: Server;
  let accessToken: string;
  let salesUser: TestUser;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '604800';
    process.env.STORAGE_LOCAL_DIR = tmpdir() + '/xzb-test-' + Date.now();
    process.env.STORAGE_PUBLIC_BASE_URL = '/api/v1/storage/files';
    // ponytail: ticket #4 - keep REDIS_URL unset so RedisService falls back to in-process Map.
    delete process.env.REDIS_URL;

    salesUser = {
      id: 'u_001',
      username: 'zhangming',
      passwordHash: await hashPassword('Xzb@2026!'),
      displayName: '张明',
      avatarUrl: null,
      role: Role.SALES,
      region: '上海',
      isActive: true,
      refreshTokenHash: null,
      refreshTokenExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };
    const customer = {
      id: 'ck_001',
      bp: 'BP100001',
      code: 'C-2026-001',
      name: '上海建工建材有限公司',
      cat: '客户',
      status: '已生效',
      contact: '张工 · 15938000123',
      addr: '上海浦东新区',
      regionBp: null,
      version: 1,
      isDeleted: false,
      deletedAt: null,
      createdById: salesUser.id,
      updatedById: salesUser.id,
      createdAt: new Date('2026-07-01T09:00:00.000Z'),
      updatedAt: new Date('2026-07-15T14:22:11.000Z'),
    };
    const project = {
      id: 'proj_001',
      no: 'PRJ-2026-012',
      name: '浦东新区防水改造工程',
      customerId: customer.id,
      customer: { name: customer.name },
      status: '已生效',
      amtCents: 14820000n,
      version: 1,
      isDeleted: false,
      createdAt: new Date('2026-07-01T09:00:00.000Z'),
      updatedAt: new Date('2026-07-15T14:22:11.000Z'),
    };
    const contract = {
      id: 'ctr_001',
      no: 'HT-2026-012',
      name: '浦东新区采购合同',
      customerId: customer.id,
      customer: { name: customer.name },
      projectId: project.id,
      project: { name: project.name },
      signedBy: customer.name,
      status: '已生效',
      amtCents: 14820000n,
      fileUrl: null,
      version: 1,
      isDeleted: false,
      createdAt: new Date('2026-07-01T09:00:00.000Z'),
      updatedAt: new Date('2026-07-15T14:22:11.000Z'),
    };
    const product = {
      id: 'prod_001',
      no: '3001-005-01',
      name: 'K11 通用型防水涂料',
      spec: '20kg/桶',
      cat: '防水材料',
      stock: 320,
      reservedQty: 0,
      priceCents: 24480,
      unit: '桶',
      isActive: true,
      isDeleted: false,
      version: 1,
      updatedAt: new Date('2026-07-15T14:22:11.000Z'),
    };
    const order = {
      id: 'ord_001',
      no: 'SO20260716-001',
      customerId: customer.id,
      customer: { name: customer.name },
      amtCents: 244800n,
      status: 'DRAFT',
      qty: '1 行 · 10 件',
      orderDate: new Date('2026-07-14T00:00:00.000Z'),
      expectedShipDate: new Date('2026-07-18T00:00:00.000Z'),
      version: 1,
      address: customer.addr,
      createdById: salesUser.id,
      createdAt: new Date('2026-07-14T00:00:00.000Z'),
      updatedAt: new Date('2026-07-14T00:00:00.000Z'),
      items: [
        {
          id: 'item_001',
          productId: product.id,
          product: { no: product.no, name: product.name, spec: product.spec, unit: product.unit },
          qty: 10,
          priceCents: product.priceCents,
        },
      ],
      logs: [],
    };
    const aftersale = {
      id: 'aft_001',
      no: 'AF20260716-005',
      orderId: order.id,
      order: { no: order.no },
      customerId: customer.id,
      customer: { name: customer.name },
      material: 'K11 防水涂料 · 10 桶',
      reason: 'QUALITY',
      status: 'PENDING_OA',
      occurredAt: new Date('2026-07-16T09:41:23.000Z'),
      images: [],
      oaFlowId: null,
      version: 1,
      isDeleted: false,
      createdAt: new Date('2026-07-16T09:41:23.000Z'),
      updatedAt: new Date('2026-07-16T09:41:23.000Z'),
    };
    const bizSubmission = {
      id: 'biz_001',
      kind: 'MEETING',
      payload: { customerId: customer.id, budgetCents: '500000' },
      status: 'DRAFT',
      customerId: customer.id,
      oaFlowId: null,
      createdById: salesUser.id,
      isDeleted: false,
      deletedAt: null,
      version: 1,
      createdAt: new Date('2026-07-16T09:41:23.000Z'),
      updatedAt: new Date('2026-07-16T09:41:23.000Z'),
    };
    const idempotencyRecords = new Map<string, IdempotencyRecordValue>();

    const fakePrisma: PrismaService = {
      user: {
        findUnique: jest.fn((input: { where: { id?: string; username?: string } }) =>
          Promise.resolve(
            input.where.id === salesUser.id || input.where.username === salesUser.username
              ? { ...salesUser }
              : null,
          ),
        ),
        findFirst: jest.fn(
          (input: { where: { refreshTokenHash?: string } }) =>
            Promise.resolve(
              input.where.refreshTokenHash === salesUser.refreshTokenHash ? { ...salesUser } : null,
            ),
        ),
        update: jest.fn(
          (input: {
            data: Partial<
              Pick<
                TestUser,
                | 'refreshTokenHash'
                | 'refreshTokenExpires'
                | 'failedLoginAttempts'
                | 'lockedUntil'
              >
            >;
          }) => {
            Object.assign(salesUser, input.data);
            return Promise.resolve({ ...salesUser });
          },
        ),
        updateMany: jest.fn(
          (input: {
            where: { refreshTokenHash?: string };
            data: Pick<TestUser, 'refreshTokenHash' | 'refreshTokenExpires'>;
          }) => {
            if (input.where.refreshTokenHash !== salesUser.refreshTokenHash) {
              return Promise.resolve({ count: 0 });
            }
            Object.assign(salesUser, input.data);
            return Promise.resolve({ count: 1 });
          },
        ),
      },
      dict: {
        findMany: jest.fn().mockResolvedValue([
          { code: 'ACTIVE', label: '已生效' },
          { code: 'PENDING', label: '审批中' },
        ]),
      },
      customer: {
        findMany: jest.fn().mockResolvedValue([customer]),
        count: jest.fn((input: { where?: { OR?: Array<{ id?: string; bp?: string }> } }) => {
          const missing = input.where?.OR?.some((entry) => entry.id === 'BP404' || entry.bp === 'BP404');
          return Promise.resolve(missing ? 0 : 1);
        }),
        findFirst: jest.fn(
          (input: {
            where?: { OR?: Array<{ id?: string; bp?: string }>; code?: { startsWith?: string } };
            select?: { code?: boolean };
            orderBy?: { code?: string };
          }) => {
            if (input.where?.OR?.some((entry) => entry.id === 'BP404' || entry.bp === 'BP404')) {
              return Promise.resolve(null);
            }
            if (input.select?.code && input.orderBy?.code) {
              return Promise.resolve({ code: customer.code });
            }
            return Promise.resolve(customer);
          },
        ),
        create: jest.fn((input: { data: typeof customer }) =>
          Promise.resolve({ ...input.data, id: 'ck_new' }),
        ),
        updateMany: jest.fn((input: { where: { version?: number } }) => {
          if (input.where.version !== customer.version) {
            return Promise.resolve({ count: 0 });
          }
          customer.version += 1;
          return Promise.resolve({ count: 1 });
        }),
        update: jest.fn(
          (input: { data: Partial<typeof customer> }) =>
            Promise.resolve({ ...customer, ...input.data }),
        ),
      },
      project: {
        findMany: jest.fn().mockResolvedValue([project]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn(
          (input: { select?: { no?: boolean }; orderBy?: { no?: string } }) =>
            Promise.resolve(input.select?.no && input.orderBy?.no ? { no: project.no } : project),
        ),
        create: jest.fn((input: { data: typeof project }) => Promise.resolve({ ...project, ...input.data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      contract: {
        findMany: jest.fn().mockResolvedValue([contract]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn(
          (input: { select?: { no?: boolean }; orderBy?: { no?: string } }) =>
            Promise.resolve(input.select?.no && input.orderBy?.no ? { no: contract.no } : contract),
        ),
        create: jest.fn((input: { data: typeof contract }) =>
          Promise.resolve({ ...contract, ...input.data }),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([product]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(product),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue(product),
      },
      order: {
        aggregate: jest.fn().mockResolvedValue({ _count: 1, _sum: { amtCents: 1248000n } }),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([order]),
        findFirst: jest.fn(
          (input: { select?: { no?: boolean }; orderBy?: { no?: string } }) =>
            Promise.resolve(input.select?.no && input.orderBy?.no ? { no: order.no } : order),
        ),
        create: jest.fn((input: { data: { status?: string; version?: number } }) => {
          order.status = input.data.status ?? order.status;
          order.version = input.data.version ?? order.version;
          return Promise.resolve(order);
        }),
        updateMany: jest.fn((input: { data: { status?: string } }) => {
          order.status = input.data.status ?? order.status;
          order.version += 1;
          return Promise.resolve({ count: 1 });
        }),
      },
      orderLog: { create: jest.fn().mockResolvedValue({ id: 'log_001' }) },
      aftersale: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([aftersale]),
        findFirst: jest.fn(
          (input: { select?: { no?: boolean }; orderBy?: { no?: string } }) =>
            Promise.resolve(input.select?.no && input.orderBy?.no ? { no: aftersale.no } : aftersale),
        ),
        create: jest.fn((input: { data: Partial<typeof aftersale> }) =>
          Promise.resolve({ ...aftersale, ...input.data }),
        ),
      },
      followTask: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'task_001',
            kind: 'APPROVAL',
            title: '订单确认',
            subtitle: '申请人：张明',
            node: '销售负责人审批',
            dueAt: new Date('2026-07-22T10:00:00.000Z'),
            status: 'PENDING',
            version: 1,
          },
        ]),
        groupBy: jest.fn().mockResolvedValue([{ status: 'PENDING', _count: 1 }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      bizSubmission: {
        findMany: jest.fn().mockResolvedValue([bizSubmission]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(bizSubmission),
        create: jest.fn((input: { data: Partial<typeof bizSubmission> }) =>
          Promise.resolve({ ...bizSubmission, ...input.data }),
        ),
        updateMany: jest.fn((input: { data: { status: string } }) => {
          bizSubmission.status = input.data.status;
          bizSubmission.version += 1;
          return Promise.resolve({ count: 1 });
        }),
      },
      storedFile: {
        create: jest.fn(
          (input: { data: { objectKey: string; storageUrl: string; mimeType: string; sizeBytes: number; originalName: string; driver: string; uploadedById: string } }) => {
            return Promise.resolve({ id: 'sf_' + input.data.objectKey, ...input.data, isDeleted: false, createdAt: new Date(), expiresAt: null });
          },
        ),
        findFirst: jest.fn((input: { where: { objectKey: string; isDeleted?: boolean } }) => {
          if (input.where.objectKey === 'missing-key') {
            return Promise.resolve(null);
          }
          return Promise.resolve({
            objectKey: input.where.objectKey,
            mimeType: 'application/pdf',
            sizeBytes: 5,
            isDeleted: false,
          });
        }),
      },
      idempotencyRecord: {
        findUnique: jest.fn((input: { where: { key: string } }) =>
          Promise.resolve(idempotencyRecords.get(input.where.key) ?? null),
        ),
        create: jest.fn(
          (input: { data: Omit<IdempotencyRecordValue, 'createdAt'> }) => {
            const record = { ...input.data, createdAt: new Date() };
            idempotencyRecords.set(input.data.key, record);
            return Promise.resolve(record);
          },
        ),
        update: jest.fn(
          (input: { where: { key: string }; data: { statusCode: number; responseBody: unknown; expiresAt: Date } }) => {
            const existing = idempotencyRecords.get(input.where.key);
            if (!existing) {
              throw new Error(`idempotency update miss: ${input.where.key}`);
            }
            const updated = { ...existing, ...input.data };
            idempotencyRecords.set(input.where.key, updated);
            return Promise.resolve(updated);
          },
        ),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(
        (
          operation: Array<Promise<unknown>> | ((client: PrismaService) => Promise<unknown>),
        ) => (typeof operation === 'function' ? operation(fakePrisma) : Promise.all(operation)),
      ),
    } as unknown as PrismaService;

    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(json({ limit: '15mb' }));
    app.use(urlencoded({ limit: '15mb', extended: false }));
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  // ponytail: ticket #1 - throttler setTimeout queue keeps the loop alive under --forceExit.
  // Cap app.close under 30s so the suite exits cleanly even when PrometheusExporter or an
  // OTel batch processor holds a socket. The .catch only logs; tests already passed by then.
  afterAll(async () => {
    let timer;
    const ceiling = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('app.close timed out after 30s')), 30_000); });
    try { await Promise.race([app.close(), ceiling]); }
    catch (e) { console.warn('app.close warning:', e instanceof Error ? e.message : String(e)); }
    finally { clearTimeout(timer); }
  });

  it('serves the public health endpoint with a trace id', async () => {
    const response = await request(httpServer)
      .get('/api/v1/health')
      .set('traceparent', '00-a1b2c3d4e5f60718293a4b5c6d7e8f90-0123456789abcdef-01')
      .expect(200);
    const body = response.body as unknown as Envelope<{ status: string }>;

    expect(body.code).toBe(0);
    expect(body.data.status).toBe('ok');
    expect(body.traceId).toBe('a1b2c3d4e5f60718293a4b5c6d7e8f90');
  });

  it('rejects protected routes and invalid login payloads', async () => {
    const unauthorized = await request(httpServer).get('/api/v1/dicts?kind=region').expect(401);
    const invalidLogin = await request(httpServer)
      .post('/api/v1/auth/login')
      .set('Idempotency-Key', randomUUID())
      .send({ username: '', password: 'short' })
      .expect(400);

    expect((unauthorized.body as unknown as Envelope<null>).code).toBe(20100);
    expect((invalidLogin.body as unknown as Envelope<null>).code).toBe(40000);
  });

  it('logs in and returns the current user', async () => {
    const key = randomUUID();
    const login = await request(httpServer)
      .post('/api/v1/auth/login')
      .set('Idempotency-Key', key)
      .send({ username: 'zhangming', password: 'Xzb@2026!' })
      .expect(200);
    const body = login.body as unknown as Envelope<{ accessToken: string }>;
    accessToken = body.data.accessToken;

    const replay = await request(httpServer)
      .post('/api/v1/auth/login')
      .set('Idempotency-Key', key)
      .send({ username: 'zhangming', password: 'Xzb@2026!' })
      .expect(200);
    expect(replay.headers['idempotent-replay']).toBe('true');
    expect((replay.body as unknown as Envelope<{ accessToken: string }>).data.accessToken).toBe(
      accessToken,
    );
    const conflictingReplay = await request(httpServer)
      .post('/api/v1/auth/login')
      .set('Idempotency-Key', key)
      .send({ username: 'zhangming', password: 'Different-Password' })
      .expect(422);
    expect((conflictingReplay.body as unknown as Envelope<null>).code).toBe(10422);

    const me = await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((me.body as unknown as Envelope<{ username: string }>).data.username).toBe('zhangming');
  });

  it('rotates refresh tokens once', async () => {
    const firstLogin = await request(httpServer)
      .post('/api/v1/auth/login')
      .set('Idempotency-Key', randomUUID())
      .send({ username: 'zhangming', password: 'Xzb@2026!' })
      .expect(200);
    const firstToken = (firstLogin.body as unknown as Envelope<{ refreshToken: string }>).data
      .refreshToken;
    const refreshed = await request(httpServer)
      .post('/api/v1/auth/refresh')
      .set('Idempotency-Key', randomUUID())
      .send({ refreshToken: firstToken })
      .expect(200);

    expect(
      (refreshed.body as unknown as Envelope<{ refreshToken: string }>).data.refreshToken,
    ).not.toBe(firstToken);
    await request(httpServer)
      .post('/api/v1/auth/refresh')
      .set('Idempotency-Key', randomUUID())
      .send({ refreshToken: firstToken })
      .expect(401);
  });

  it('returns dictionaries and customer pages', async () => {
    const dicts = await request(httpServer)
      .get('/api/v1/dicts?kind=customer_status')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const customers = await request(httpServer)
      .get('/api/v1/customers?page=1&size=20&keyword=上海')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((dicts.body as unknown as Envelope<{ items: unknown[] }>).data.items).toHaveLength(2);
    expect((customers.body as unknown as Envelope<{ total: number }>).data.total).toBe(1);
  });

  it('returns customer details and supports create and update', async () => {
    const detail = await request(httpServer)
      .get('/api/v1/customers/BP100001')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      (detail.body as unknown as Envelope<{ stats: { orderTotalCents: number } }>).data.stats
        .orderTotalCents,
    ).toBe('1248000');

    const payload = {
      name: '新客户',
      cat: '客户',
      status: '审批中',
      contact: '李工 · 13800000000',
      addr: '上海市',
    };
    await request(httpServer)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send(payload)
      .expect(201);
    await request(httpServer)
      .patch('/api/v1/customers/BP100001')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .set('If-Match', '1')
      .send({ status: '已生效' })
      .expect(200);

    const concurrentWrites = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        request(httpServer)
          .patch('/api/v1/customers/BP100001')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .set('If-Match', '2')
          .send({ contact: `并发联系人 ${index}` }),
      ),
    );
    expect(concurrentWrites.filter((response) => response.status === 200)).toHaveLength(1);
    expect(concurrentWrites.filter((response) => response.status === 409)).toHaveLength(9);
  });

  it('serves project, contract, and product flows', async () => {
    await request(httpServer)
      .get('/api/v1/projects?page=1&size=20')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .get('/api/v1/projects/proj_001')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ name: '新项目', customerId: 'ck_001', status: '审批中', amtCents: '500000' })
      .expect(201);
    await request(httpServer)
      .patch('/api/v1/projects/proj_001')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .set('If-Match', '1')
      .send({ status: '已生效' })
      .expect(200);

    await request(httpServer)
      .get('/api/v1/contracts?page=1&size=20')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .get('/api/v1/contracts/ctr_001')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .post('/api/v1/contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        name: '新合同',
        customerId: 'ck_001',
        projectId: 'proj_001',
        status: '审批中',
        amtCents: '500000',
      })
      .expect(201);
    await request(httpServer)
      .patch('/api/v1/contracts/ctr_001')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .set('If-Match', '1')
      .send({ status: '已生效' })
      .expect(200);

    await request(httpServer)
      .get('/api/v1/products?page=1&size=20')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .get('/api/v1/products/prod_001')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    salesUser.role = Role.REGION_MGR;
    await request(httpServer)
      .patch('/api/v1/products/prod_001/stock')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .set('If-Match', '1')
      .send({ stockDelta: 5, remark: '调拨入库' })
      .expect(200);
    salesUser.role = Role.SALES;
  });

  it('serves order, aftersale, and follow flows', async () => {
    await request(httpServer)
      .get('/api/v1/orders?page=1&size=20')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .get('/api/v1/orders/ord_001')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        customerId: 'ck_001',
        address: '上海浦东新区',
        expectedShipDate: '2026-07-30',
        items: [{ productId: 'prod_001', qty: 10 }],
      })
      .expect(201);
    await request(httpServer)
      .patch('/api/v1/orders/ord_001/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .set('If-Match', '1')
      .send({ status: 'PENDING_CONFIRM', remark: '提交确认' })
      .expect(204);

    await request(httpServer)
      .get('/api/v1/aftersales?page=1&size=20')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .get('/api/v1/aftersales/aft_001')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .post('/api/v1/aftersales')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        orderId: 'ord_001',
        material: 'K11 防水涂料 · 10 桶',
        reason: 'QUALITY',
        occurredAt: '2026-07-21T09:00:00.000Z',
        images: [],
      })
      .expect(201);

    await request(httpServer)
      .get('/api/v1/follow/todos?filter=PENDING')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .post('/api/v1/follow/todos/task_001/done')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ remark: '已处理' })
      .expect(204);
    await request(httpServer)
      .post('/api/v1/follow/todos/task_002/cancel')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ reason: '客户撤回' })
      .expect(204);
  });

  it('serves business forms, AI, and personal views', async () => {
    await request(httpServer)
      .get('/api/v1/biz?kind=MEETING&page=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .get('/api/v1/biz/biz_001')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .post('/api/v1/biz/MEETING')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ customerId: 'ck_001', topic: '新品推广', budgetCents: '500000' })
      .expect(201);

    salesUser.role = Role.ADMIN;
    await request(httpServer)
      .patch('/api/v1/biz/biz_001/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .set('If-Match', '1')
      .send({ status: 'PENDING' })
      .expect(200);
    salesUser.role = Role.SALES;

    await request(httpServer)
      .get('/api/v1/ai/modules')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .post('/api/v1/ai/insight/invoke')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ prompt: '分析客户近期订单' })
      .expect(201);
    await request(httpServer)
      .get('/api/v1/ai/insight/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(httpServer)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .get('/api/v1/me/reports?period=MONTH')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(httpServer)
      .get('/api/v1/me/utilities')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('enforces role checks and customer not-found errors', async () => {
    const jwtService = app.get(JwtService);
    const financeToken = await jwtService.signAsync({
      sub: salesUser.id,
      role: Role.FINANCE,
      region: '上海',
    });
    salesUser.role = Role.FINANCE;
    await request(httpServer)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${financeToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ name: '客户', cat: '客户', status: '已生效', contact: '联系人', addr: '地址' })
      .expect(403);

    salesUser.role = Role.SALES;
    const missing = await request(httpServer)
      .get('/api/v1/customers/BP404')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
    expect((missing.body as unknown as Envelope<null>).code).toBe(10404);
  });

  it('logs out without a response body', async () => {
    await request(httpServer)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .expect(204);
    expect(salesUser.refreshTokenHash).toBeNull();
  });
  it('exposes storage upload, sign-url and cache headers', async () => {
    salesUser.role = Role.SALES;
    const smallPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]).toString('base64');
    const tooBig = Buffer.alloc(10 * 1024 * 1024 + 1, 0x41).toString('base64');

    const rejected = await request(httpServer)
      .post('/api/v1/storage/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ name: 'malware.exe', mimeType: 'application/x-msdownload', base64: smallPng });
    expect(rejected.status).toBe(400);
    expect((rejected.body as unknown as Envelope<null>).code).toBe(40001);

    const tooLarge = await request(httpServer)
      .post('/api/v1/storage/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ name: 'big.png', mimeType: 'image/png', base64: tooBig });
    expect(tooLarge.status).toBe(413);
    expect((tooLarge.body as unknown as Envelope<null>).code).toBe(40002);

    const uploaded = await request(httpServer)
      .post('/api/v1/storage/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ name: 'note.png', mimeType: 'image/png', base64: smallPng })
      .expect(201);
    const storedUrl = (uploaded.body as unknown as Envelope<{ url: string }>).data.url;
    expect(storedUrl.startsWith('/api/v1/storage/files/uploads/')).toBe(true);

    const badSign = await request(httpServer)
      .post('/api/v1/storage/sign-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ url: 'https://cdn.example.com/private/xxx.pdf' });
    expect(badSign.status).toBe(400);
    expect((badSign.body as unknown as Envelope<null>).code).toBe(40004);

    const signed = await request(httpServer)
      .post('/api/v1/storage/sign-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ url: storedUrl })
      .expect(200);
    const signedUrl = (signed.body as unknown as Envelope<{ signedUrl: string }>).data.signedUrl;
    expect(signedUrl).toMatch(/^\/api\/v1\/storage\/files\/.+\?exp=\d+&sig=[a-f0-9]+$/);

    const download = await request(httpServer).get(signedUrl).expect(200);
    expect(download.headers['content-type']).toBe('application/pdf');
    expect(Number(download.headers['content-length'])).toBe(5);

    const dictResponse = await request(httpServer)
      .get('/api/v1/dicts?kind=customer_status')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(dictResponse.headers['cache-control']).toBe('public, max-age=300, s-maxage=600');

    const meResponse = await request(httpServer)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meResponse.headers['cache-control']).toBe('private, max-age=60');
  });

  it('returns 422 / 10422 when Prisma P2002 escapes the customer service', async () => {
    interface FakeCustomerPrisma {
      customer: { create: jest.Mock; findFirst: jest.Mock };
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const prisma = app.get(PrismaService) as unknown as FakeCustomerPrisma;
    const originalCreate = prisma.customer.create;
    prisma.customer.create = jest.fn(() => {
      throw new Prisma.PrismaClientKnownRequestError('unique violation', { code: 'P2002', clientVersion: 'test' });
    });
    const conflict = await request(httpServer)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ name: '冲突客户', cat: '客户', status: '已生效', contact: '联系人', addr: '地址' });
    expect(conflict.status).toBe(422);
    expect((conflict.body as unknown as Envelope<null>).code).toBe(10422);
    prisma.customer.create = originalCreate;
  });

  it('returns 404 / 10404 when Prisma P2025 escapes the service', async () => {
    interface FakeCustomerPrisma {
      customer: { create: jest.Mock; findFirst: jest.Mock };
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const prisma = app.get(PrismaService) as unknown as FakeCustomerPrisma;
    const originalFind = prisma.customer.findFirst;
    prisma.customer.findFirst = jest.fn(() => {
      throw new Prisma.PrismaClientKnownRequestError('not found', { code: 'P2025', clientVersion: 'test' });
    });
    const notFound = await request(httpServer)
      .get('/api/v1/customers/cu_missing')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
    expect((notFound.body as unknown as Envelope<null>).code).toBe(10404);
    prisma.customer.findFirst = originalFind;
  });

  it('validates each biz kind payload shape and money strings', async () => {
    const invalid = await request(httpServer)
      .post('/api/v1/biz/MEETING')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({});
    expect(invalid.status).toBe(400);
    expect((invalid.body as unknown as Envelope<null>).code).toBe(40000);

    const badMoney = await request(httpServer)
      .post('/api/v1/biz/SUBSIDY')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        customerId: 'ck_001',
        subsidyType: '门店装修',
        amountCents: 'abc',
        periodStart: '2026-07-01',
      });
    expect(badMoney.status).toBe(400);
    expect((badMoney.body as unknown as Envelope<null>).code).toBe(40000);

    const badDate = await request(httpServer)
      .post('/api/v1/biz/ADVERT')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        customerId: 'ck_001',
        channel: '门店大屏',
        periodStart: '2026-08-01',
        periodEnd: '2026-07-01',
        budgetCents: '500000',
      });
    expect(badDate.status).toBe(400);
    expect((badDate.body as unknown as Envelope<null>).code).toBe(40000);

    const stocking = await request(httpServer)
      .post('/api/v1/biz/STOCKING')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        customerId: 'ck_001',
        items: [{ productId: 'prod_001', qty: 3 }],
        totalQty: 3,
        expectedDate: '2026-07-21',
      })
      .expect(201);

    const advert = await request(httpServer)
      .post('/api/v1/biz/ADVERT')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        customerId: 'ck_001',
        channel: '门店大屏',
        periodStart: '2026-07-01',
        periodEnd: '2026-08-01',
        budgetCents: '500000',
      })
      .expect(201);

    const rental = await request(httpServer)
      .post('/api/v1/biz/RENTAL')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        customerId: 'ck_001',
        itemName: '脚手架',
        startDate: '2026-07-01',
        endDate: '2026-07-15',
        dailyRateCents: '150000',
      })
      .expect(201);

    expect(stocking.status).toBe(201);
    expect(advert.status).toBe(201);
    expect(rental.status).toBe(201);
  });


});
