# 后端开发文档 · 销卓宝 v1.1

> 版本：v1.1 · 2026-07-21
> 负责：用户（新分支，独立仓库）
> 与本文档对应的开发目录：`server/` 或独立新建 `销卓宝-backend/`
> 接口契约详表：`docs/API.md`（v1.1，必须严格遵守）
> 前端代码：`docs/FRONTEND.md` (v1.1) + `v3-uniapp/`
> 后台代码：Refine（独立技术栈，详见 `docs/ADMIN.md`）
> **配套文档**：`docs/INTEGRATION.md`（SAP/OA 集成）· `docs/OPERATIONS.md`（可观测+CI/CD+部署）· `docs/COMPLIANCE.md`（微信小程序合规）· `docs/ADMIN.md`（Refine 后台）

---

## 0. v1.1 变更摘要

| 区域 | v1.0 | v1.1 |
|---|---|---|
| PK 策略 | mixed（部分用业务字段做 PK） | **统一 cuid 主键 + 业务字段加 unique** |
| 金额持久化 | BigInt | BigInt（不变） |
| 金额 API 输出 | 同 持久化 | **统一字符串**（防 JS 大数溢出） |
| 软删除 | Base.isDeleted 设计了但 model 都没接 | **每个业务 model 加 `isDeleted` + `deletedAt` + 索引** |
| 乐观锁 | 无 | **Order/Product/Aftersale/BizSubmission 加 `version`** + If-Match header |
| Idempotency | 无 | **POST/PATCH/DELETE 强制 Idempotency-Key**（Redis SETNX 24h） |
| Cache | 无策略 | **Redis 60s / 字典 300s public** |
| 链路追踪 | 16位 UUID（前后端不对） | **W3C `traceparent`**（OTel） |
| SAP/OA 集成 | §7 一句话带过 | **详见 `docs/INTEGRATION.md`**，含 DLQ / 重试 / 离线兜底 |
| 状态机 | 文字描述 | **详见 §18，每个状态跃迁都有 RBAC 守卫** |

---

## 1. 技术栈（推荐，可替换）

| 类别 | 推荐 | 备选 | 理由 |
|---|---|---|---|
| 语言 | TypeScript（strict） | — | 与前端共享 zod schema |
| 运行时 | Node.js 20 LTS | — | 与前端构建工具一致 |
| 框架 | **NestJS 10** | Fastify / Express | 模块化 / DI / OpenAPI 内置 |
| ORM | Prisma 5 | Drizzle / TypeORM | 类型安全 + migration 简洁 |
| 数据库 | PostgreSQL 16 | MySQL 8 | JSONB 友好，适合半结构化业务字段 |
| 校验 | zod | class-validator | 与前端完全对齐 schema |
| 鉴权 | JWT (access + refresh) + Redis 黑名单 | OAuth2 | 适合企业内部 + 可扩展第三方 |
| 缓存 | Redis 7 | — | 缓存 / 限流 / 字典 / Idempotency-Key |
| MQ | BullMQ + Redis | — | 异步任务（SAP 同步、AI 调用、文件转码） |
| 对象存储 | 腾讯云 COS / AWS S3 | MinIO | 合同 PDF / 施工照片 |
| 日志 | Pino + Loki / OTLP | — | 结构化 + 聚合 |
| Tracing | OpenTelemetry SDK + OTLP | — | W3C traceparent 全链路 |
| 指标 | OpenTelemetry metrics → Prometheus | — | RED（Rate / Error / Duration） |
| 部署 | Docker + docker-compose | Kubernetes | 单机起步，后期再 K8s |
| 测试 | Jest + Supertest + Testcontainers | Vitest | Nest 文档齐全 |

---

## 2. 模块地图

```
server/src/
├── modules/
│   ├── auth/            # 登录 / refresh / 短信验证码
│   ├── customers/       # 客商
│   ├── projects/        # 项目
│   ├── contracts/       # 合同
│   ├── products/        # 商品
│   ├── orders/          # 销售订单（含状态机）
│   ├── aftersales/      # 销退售后（含状态机）
│   ├── follow/          # 跟进 / 待办
│   ├── biz/             # 8 业务表单（含状态机）
│   ├── ai/              # AI 模块代理
│   └── me/              # 用户中心、profile、report
├── common/
│   ├── decorators/      # @CurrentUser / @Roles / @Idempotent / @IfMatch
│   ├── guards/          # JwtAuthGuard / RolesGuard / ThrottlerGuard / IdempotencyGuard
│   ├── filters/         # 全局异常（统一响应壳）
│   ├── interceptors/    # 日志 / 响应包装 / 超时 / traceparent 注入
│   ├── pipes/           # zod 校验管道（与前端 schema 同源）
│   └── middleware/      # Idempotency-Key / Cache / If-Match
├── infra/
│   ├── prisma/          # schema.prisma + migrations + seed
│   ├── redis/           # cache + rate-limit + idempotency
│   ├── sap/             # SAP 客户端（详见 docs/INTEGRATION.md）
│   ├── oa/              # OA 审批适配 + webhook receiver
│   ├── storage/         # COS / S3 客户端
│   ├── mq/              # BullMQ 任务定义 + DLQ 配置
│   ├── otel/            # OTel SDK 初始化（tracer + meter + logger）
│   └── metrics/         # 自定义业务指标
├── config/              # @nestjs/config 配置
├── main.ts              # bootstrap + OTel SDK 启动
└── app.module.ts
```

---

## 3. 数据模型（Prisma schema v1.1）

> v1.1 关键变更：
> - 所有 model 加 `id String @id @default(cuid())` 做主键
> - 业务编码（`bp` / `no`）改为 `@unique`，不再做 PK
> - 所有业务 model 加 `version Int @default(0)` + `isDeleted Boolean @default(false)` + `deletedAt DateTime?`
> - 金额一律 BigInt，API 输出 string

```prisma
// === 公共 ===
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  mobile       String   @unique
  displayName  String
  avatarUrl    String?
  role         Role     @default(SALES)
  region       String?
  isActive     Boolean  @default(true)
  refreshToken String?  // hashed
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  version      Int      @default(0)
}

enum Role { SALES REGION_MGR FINANCE ADMIN }

// === 客商 ===
model Customer {
  id          String   @id @default(cuid())
  bp          String   @unique        // 业务编码（v1.0 是 PK，v1.1 改为 unique）
  code        String   @unique        // 内部编码
  name        String
  cat         String   // 客户 / 经销商（从 Dict 字典）
  status      String
  contact     String
  addr        String
  regionBp    String?  // 上级经销商 BP
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  version     Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String?
  updatedById String?

  // 关系
  projects    Project[]
  contracts   Contract[]
  orders      Order[]
  aftersales  Aftersale[]
  bizSubs     BizSubmission[]

  @@index([isDeleted, status])
  @@index([regionBp])
  @@index([name])
}

// === 项目 / 合同 ===
model Project {
  id          String   @id @default(cuid())
  no          String   @unique       // 业务编码
  name        String
  customerId  String                  // FK Customer.id（v1.0 是 customerBp）
  customer    Customer @relation(fields: [customerId], references: [id])
  status      String
  amtCents    BigInt                  // 整数分（API 输出 string）
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  version     Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  contracts   Contract[]
  @@index([isDeleted, customerId])
}

model Contract {
  id          String   @id @default(cuid())
  no          String   @unique
  name        String
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  signedBy    String?
  status      String                  // 已生效 / 审批中 / 待盖章
  amtCents    BigInt
  fileUrl     String?                 // COS 路径，非完整 URL
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  version     Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([isDeleted, status])
}

// === 商品 ===
model Product {
  id          String   @id @default(cuid())
  no          String   @unique       // 物料号
  name        String
  spec        String
  cat         String                  // 防水材料 / 节能材料 / 辅材
  stock       Int      @default(0)   // 可用库存（实时）
  reservedQty Int      @default(0)   // 订单已占
  priceCents  Int                     // 单价（分）—— 商品单价不会爆，用 Int
  unit        String                  // 桶 / 块 / ㎡ / 个
  isActive    Boolean  @default(true)
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  version     Int      @default(0)   // 库存并发调拨用
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([isDeleted, cat])
}

// === 订单 ===
model Order {
  id          String   @id @default(cuid())
  no          String   @unique
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  amtCents    BigInt                  // BigInt（API 输出 string）
  status      OrderStatus
  qty         String                  // "2 行 · 15 件"
  orderDate   DateTime
  expectedShipDate DateTime?
  address     String
  createdById String
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  version     Int      @default(0)   // 状态机并发更新
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  items       OrderItem[]
  logs        OrderLog[]
  @@index([isDeleted, status, orderDate])
  @@index([customerId])
}

enum OrderStatus {
  DRAFT
  PENDING_CONFIRM
  CONFIRMED
  SHIPPED
  COMPLETED
  CANCELLED
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id])
  productId   String
  product     Product @relation(fields: [productId], references: [id])
  qty         Int
  priceCents  Int
}

model OrderLog {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id])
  action    String                  // "创建订单" / "客户确认" / ...
  actor     String                  // displayName
  at        DateTime @default(now())
  remark    String?
}

// === 售后 ===
model Aftersale {
  id          String   @id @default(cuid())
  no          String   @unique
  orderId     String                  // 关联 Order.id
  material    String                  // 冗余展示字段
  reason      AftersaleReason
  status      AftersaleStatus
  occurredAt  DateTime
  images      String[]                // COS URL 数组
  oaFlowId    String?
  createdById String
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  version     Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])

  @@index([isDeleted, status])
}

enum AftersaleReason { QUALITY WRONG_GOODS DAMAGED OTHER }
enum AftersaleStatus { PENDING_OA SAP_CREATED IN_HANDLING CLOSED REJECTED }

// === 跟进 / 待办 ===
model FollowTask {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  kind        FollowKind
  title       String
  subtitle    String?
  node        String
  dueAt       DateTime?
  status      FollowStatus @default(PENDING)
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  version     Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  customerId  String?
  @@index([userId, status])
  @@index([dueAt])
}

enum FollowKind { APPROVAL INQUIRY AFTERSALE GENERAL }
enum FollowStatus { PENDING IN_PROGRESS DONE CANCELLED }

// === 8 业务表单（字段 JSONB） ===
model BizSubmission {
  id          String   @id @default(cuid())
  kind        BizKind
  payload     Json                       // 业务字段
  status      BizStatus @default(DRAFT)
  customerId  String?
  customer    Customer? @relation(fields: [customerId], references: [id])
  oaFlowId    String?
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  version     Int      @default(0)
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([kind, isDeleted, status])
  @@index([customerId])
}

enum BizKind   { MEETING STOCKING SHIPMENT ADVERT STORE SUBSIDY RENTAL COMPLAINT }
enum BizStatus { DRAFT PENDING APPROVED REJECTED CLOSED }

// === 字典 ===
model Dict {
  id        String   @id @default(cuid())
  kind      String                    // customer_status / order_status / product_cat ...
  code      String
  label     String
  sort      Int      @default(0)
  isActive  Boolean  @default(true)
  @@unique([kind, code])
  @@index([kind, isActive])
}

// === Idempotency-Key 持久化（24h 过期） ===
model IdempotencyRecord {
  key        String   @id              // 客户端 UUID
  userId     String
  method     String
  path       String
  bodyHash   String                    // sha256(body)
  statusCode Int
  responseBody Json
  createdAt  DateTime @default(now())
  expiresAt  DateTime                   // 24h 后
  @@index([expiresAt])
}
```

### 3.1 软删除 helper

```typescript
// prisma/softDelete.ts
import { Prisma } from '@prisma/client';

export const activeScope = {
  isDeleted: false,
} as const;

export const softDeleteMiddleware: Prisma.Middleware = async (params, next) => {
  if (!params.model) return next(params);
  if (params.action === 'findUnique' || params.action === 'findFirst') {
    params.args.where = { ...params.args.where, isDeleted: false };
  }
  if (params.action === 'findMany') {
    if (!params.args.where?.isDeleted) {
      params.args.where = { ...params.args.where, isDeleted: false };
    }
  }
  if (params.action === 'delete') {
    const { where } = params.args;
    params.action = 'update';
    params.args.data = { isDeleted: true, deletedAt: new Date() };
    return next(params);
  }
  return next(params);
};
```

### 3.2 乐观锁 helper

```typescript
// common/decorators/if-match.decorator.ts
export const IfMatchVersion = createParamDecorator((_, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return parseInt(req.headers['if-match'], 10);
});

// common/interceptors/optimistic-lock.interceptor.ts
@Injectable()
export class OptimisticLockInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      tap(async (result) => {
        const req = ctx.switchToHttp().getRequest();
        if (!req.headers['if-match']) return;
        const version = parseInt(req.headers['if-match'], 10);
        // 在 service 中：UPDATE ... WHERE id = ? AND version = ? → 影响行数为 0 则返 10009
      }),
    );
  }
}
```

实际乐观锁写在 service：

```typescript
async update(id: string, version: number, data: any) {
  const r = await this.prisma.order.updateMany({
    where: { id, version, isDeleted: false },
    data: { ...data, version: { increment: 1 } },
  });
  if (r.count === 0) {
    throw new OptimisticLockError();  // 拦截器转 HTTP 409 + code 10009
  }
}
```

---

## 4. 鉴权 / 权限

（v1.0 内容不变；如需迭代看 `docs/API.md` §2 与 HTTP/业务码段位）

补充 RBAC 实现位置：

```
src/common/guards/roles.guard.ts
src/common/decorators/roles.decorator.ts

@Roles(Role.SALES, Role.REGION_MGR)
@UseGuards(JwtAuthGuard, RolesGuard)
@Patch('orders/:id/status')
async updateStatus() { ... }
```

---

## 5. 响应壳（与 `api/client.ts` 对齐）

```typescript
// 成功
{ "code": 0, "data": <T>, "msg": "ok", "traceId": "..." }

// 失败
{ "code": 10404, "data": null, "msg": "...", "traceId": "..." }
```

`code` 用业务码段位（v1.1 重写），HTTP 用原生语义（401/403/404/409/422/429）。详见 `docs/API.md` §12 全表。

---

## 6. 接口总览

（v1.0 不变；细节按 `docs/API.md` v1.1 实施）

---

## 7. 外部集成总览

集成子系统：**SAP、OA、COS、Redis、消息队列**。

> **⚠️ 实施期最大风险**：SAP/OA 集成是项目"时间黑洞"，文档原 §7 一句话带过是不合理的。详见 `docs/INTEGRATION.md`（含连接 / 重试 / DLQ / 离线兜底策略）。

简短版：

| 系统 | 用途 | 失败兜底 |
|---|---|---|
| SAP (RFC/OData) | BP/PRJ/SO/MAT 数据源 | 30 分钟定时重同步 + DLQ + 业务降级 |
| OA (webhook) | 业务表单审批 | 失败重试 3 次 → DLQ → 飞书告警 |
| 腾讯云 COS / S3 | 合同 PDF / 售后照片 | 客户端直传 OSS，前端拿签名 URL 直传 |
| Redis | 缓存 / 限流 / Idempotency | 主从 + 哨兵 |
| BullMQ + Redis | 异步任务 | 失败进入 DLQ，按任务类型告警 |

---

## 8. 配置（.env.example）

```ini
# 服务
NODE_ENV=development
PORT=4000
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/xiaozhuobao

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=replace-me-with-32-byte-random
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800

# SAP（详见 docs/INTEGRATION.md §2）
SAP_BASE_URL=
SAP_USER=
SAP_PASS=
SAP_CLIENT=
SAP_RFC_DEST=

# OA
OA_WEBHOOK_URL=
OA_WEBHOOK_TOKEN=
OA_APP_ID=

# 对象存储
STORAGE_DRIVER=cos   # cos | s3 | minio
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

# OTel（详见 docs/OPERATIONS.md §3）
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=xzb-server

# 业务开关
BIZ_FEAT_SAP_SYNC=true
BIZ_FEAT_OA_WEBHOOK=true
```

---

## 9. 本地开发

```bash
git checkout -b codex/server-v1.1
cd server
npm install
docker compose up -d            # postgres + redis + otel-collector + minio
npx prisma migrate dev
npx prisma db seed              # 注入 v2 种子数据
npm run start:dev               # 监听 4000
```

CI 流水线见 `docs/OPERATIONS.md`。

---

## 10. 部署

详见 `docs/OPERATIONS.md` §5（部署）。

---

## 11. 待与前端对齐的事项

（v1.0 大部分不变；v1.1 新增）：
- 金额：服务端 API 返字符串 → 前端用 decimal.js 解码
- 错误码：前端拦截器按 v1.1 段位（1xxxx/2xxxx/4xxxx/5xxxx），不匹配则不可信
- monorepo：见 `docs/OPERATIONS.md` §4.2（pnpm workspace 路径）

---

## 12. 验收清单

- [ ] **P0 错误码**：所有 5xx 业务码按 v1.1 表分配，自动化测试覆盖全段位
- [ ] **PK 策略**：`prisma migrate` 适配 v1.1 schema；旧数据迁移脚本（customer.bp 抽 unique 同时支持 cuid 关联）
- [ ] **大数字段**：`tsc --noEmit` 覆盖每个端点的响应类型，BigInt 不出现 `number`
- [ ] **Idempotency**：POST/PATCH/DELETE 单元测试，重复同 key + 同 body 命中重放；不同 body 返 422
- [ ] **乐观锁**：并发写测试，并发 10 个请求只有一个成功，其余 409
- [ ] **软删除**：DELETE 实际是 UPDATE，全局 middleware 隐藏已删数据
- [ ] **traceparent**：跨服务调用链必须贯通，OTel 调试器看到所有 span
- [ ] Swagger UI 可访问
- [ ] 至少 5 个字典端点 / 5 个核心 CRUD 跑通真数据
- [ ] 单实例 Docker 跑起来，`/health` 返 200

---

## 13. Observability（v1.1 新增）

详见 `docs/OPERATIONS.md` §3，关键摘要：

### 13.1 日志字段（Pino）

每条日志必带：

| 字段 | 来源 |
|---|---|
| `timestamp` | 自动 |
| `level` | 自动 |
| `service` | `xzb-server` |
| `traceId` | `traceparent` 解析（W3C） |
| `spanId` | 当前 span |
| `userId` | JWT 解析后注入 |
| `route` | Express middleware |
| `method` | HTTP method |
| `latencyMs` | 响应时长 |
| `errorCode` | 业务码（如有） |
| `errorStack` | 仅 LOG_LEVEL=debug 时输出 |

### 13.2 指标（OpenTelemetry Metrics）

**RED 指标**：

- `http_requests_total{method, route, status}` (counter)
- `http_request_duration_seconds{method, route}` (histogram)
- `http_requests_error_total{method, route, error_code}` (counter)

**业务指标**：

- `order_state_transition_total{from, to}` (counter)
- `biz_submission_total{kind, status}` (counter)
- `sap_call_total{endpoint, status}` (counter) — 注意上游系统单独计
- `cache_hit_total{cache_key_pattern}` (counter)
- `idempotency_replay_total{endpoint}` (counter)
- `product_stock_reservation_total{outcome}` (counter) — outcome=reserved|insufficient

### 13.3 告警（Alertmanager 规则示例）

```yaml
groups:
- name: xzb-server
  rules:
  - alert: HighErrorRate
    expr: sum(rate(http_requests_error_total[5m])) / sum(rate(http_requests_total[5m])) > 0.05
    for: 5m
    labels: { severity: page }
    annotations: { summary: "错误率 > 5% 持续 5 分钟" }
  - alert: SAPDownstream
    expr: sum(rate(sap_call_total{status="failed"}[5m])) > 1
    for: 10m
    labels: { severity: page }
    annotations: { summary: "SAP 调用持续失败 ≥1/s 持续 10 分钟" }
  - alert: DLQGrowth
    expr: increase(bullmq_dlq_count[1h]) > 0
    labels: { severity: warn }
```

---

## 14. SAP / OA 集成深度（v1.1 提升）

详见 `docs/INTEGRATION.md`，本节只列高层：

| 风险 | 缓解 |
|---|---|
| SAP RFC 调用慢（30s+） | 同步从 SAP 拉改为：定时任务拉 + 业务层推（队列） |
| OA webhook 延迟 | 客户端轮询 + 状态被动刷新 |
| SAP 字段映射错 | 集成层加 mock 总集，单元测试覆盖映射 |
| COS 上传失败 | 客户端重试 + 服务端临时存储再异步转 COS |
| DLQ 漏处理 | 飞书告警 + 周一人工巡检 |

---

## 15. CI/CD（v1.1 新增）

详见 `docs/OPERATIONS.md` §4，关键步骤：

1. GitHub Actions：lint → typecheck → test coverage (>70%) → build → docker push
2. PR 门禁：以上任何失败阻止合并
3. Preview 环境：每 PR 自动部署到独立域名（`pr-123.xzb-dev.example.com`）
4. Main 合并 → staging → 生产（手动 approve）
5. 数据库 migration 用 `prisma migrate deploy` 而非 `dev`

---

## 16. 合规检查清单（v1.1 新增）

微信小程序上线前必做，详见 `docs/COMPLIANCE.md`：

- 域名白名单（含业务域名 / API 域名 / 文件下载域名）
- TLS 1.2+ 证书
- ICP 备案
- 隐私协议 + 用户协议（必须放在前端可访问页面）
- 后端域名必须是 HTTPS
- 数据出境合规（如业务出海）

---

## 17. 状态机（v1.1 新增）

| 实体 | 状态 | 跃迁 | 守卫 |
|---|---|---|---|
| Order | DRAFT → PENDING_CONFIRM → CONFIRMED → SHIPPED → COMPLETED | 见 §5.4 | 创建者 / 客户 / 仓储 |
| Order | 任一 → CANCELLED | 见 §5.4 | REGION_MGR |
| Aftersale | PENDING_OA → SAP_CREATED → IN_HANDLING → CLOSED | 见 §6.1 | OA webhook / REGION_MGR |
| BizSubmission | DRAFT → PENDING → APPROVED → CLOSED | 见 §8.1 | OA webhook |
| BizSubmission | 任一 → REJECTED | OA webhook | — |

**实现层**：

- 每个状态字段用 Prisma enum（数据库约束）
- 业务层写 `canTransition(from, to, userRole)` 守卫函数
- 状态变更服务调用守卫，不通过返 OptimisticLockError 或 StateTransitionError

```typescript
// modules/orders/state-machine.ts
const TRANSITIONS: Record<OrderStatus, { to: OrderStatus; roles: Role[] }[]> = {
  DRAFT:            [{ to: 'PENDING_CONFIRM', roles: ['SALES'] }],
  PENDING_CONFIRM:  [{ to: 'CONFIRMED', roles: ['SALES','REGION_MGR'] }, { to: 'CANCELLED', roles: ['SALES'] }],
  CONFIRMED:        [{ to: 'SHIPPED', roles: ['ADMIN'] }, { to: 'CANCELLED', roles: ['REGION_MGR','ADMIN'] }],
  SHIPPED:          [{ to: 'COMPLETED', roles: ['SALES','REGION_MGR'] }],
  COMPLETED:        [],
  CANCELLED:        [],
};
```

---

## 18. 参考资料

- NestJS 官方：https://docs.nestjs.com/
- Prisma：https://www.prisma.io/docs
- BullMQ + DLQ：https://docs.bullmq.io/
- OpenTelemetry Node.js：https://opentelemetry.io/docs/languages/js/
- 接口契约：`docs/API.md` (v1.1)
- 前端开发：`docs/FRONTEND.md` (v1.1)
- 集成：`docs/INTEGRATION.md`
- 运维/可观测/CI/CD：`docs/OPERATIONS.md`
- 合规：`docs/COMPLIANCE.md`
- 后台：`docs/ADMIN.md`
- TDesign 零售模板业务字段参考：https://github.com/Tencent/tdesign-miniprogram-starter-retail
