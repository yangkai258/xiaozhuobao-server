# 销卓宝 v3 后端

NestJS 10 + Prisma 5 + PostgreSQL 16 实现，对齐 `docs/BACKEND.md` (v1.1) + `docs/API.md` (v1.1)。

## 已覆盖模块

- 鉴权（JWT access + refresh，刷新令牌单次轮换，登录失败 5 次锁定 15 分钟）
- 客商（CRUD、BP/code 重名校验、`If-Match` 乐观锁、详情聚合）
- 项目 / 合同 / 商品（含库存调拨 + 版本号）
- 订单（创建预占库存、状态机 + 乐观锁、幂等、cursor 分页）
- 售后（OA 状态机）
- 跟进待办（列表 / 完成 / 取消）
- 8 大业务表单（kind 通过 zod enum + JSONB payload）
- AI 模块（`/ai/modules`、`/ai/:module/invoke`、`/ai/:module/history`，进程内历史）
- 我的（profile / reports / utilities）
- 字典（kind+code 唯一，前端可缓存）
- 文件存储（`/storage/upload` JSON 体、`/storage/sign-url` 临时签名、`/storage/files/*` 签名下载，本地 driver 占位）
- 健康检查

## 公共管线

- 全局 `ApiExceptionFilter`：业务码 → HTTP 状态码映射（v1.1 段位：1xxxx/2xxxx/4xxxx/5xxxx）
- 全局 `ResponseInterceptor`：统一 `{ code, data, msg, traceId }` 响应壳
- 全局 `IdempotencyInterceptor`：POST/PATCH/DELETE 强制 `Idempotency-Key`，回放命中带 `Idempotent-Replay: true`
- 全局 `CacheControlInterceptor`：GET 自动追加 `Cache-Control`（字典 5min public，个人 60s private）
- 全局 `JwtAuthGuard` + `RolesGuard`
- `TraceIdMiddleware`：W3C `traceparent` 解析 + `X-Trace-Id` 回传
- `softDeleteMiddleware`：自动 `find*` 加 `isDeleted:false`，`delete` 转 `update isDeleted=true`
- `ZodValidationPipe`：与前端共享 schema，校验失败 400 + `code=40000`
- 乐观锁：service 层 `updateMany WHERE version=?`，count=0 抛 `10009`

## 本地启动

```bash
cp .env.example .env
docker compose up -d             # postgres + redis（如需 BullMQ 可选）
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

- API 基础地址：`http://localhost:4000/api/v1`
- Swagger UI：`http://localhost:4000/api/v1/docs`
- 健康检查：`http://localhost:4000/api/v1/health`
- 种子账号：`zhangming`
- 种子密码：`Xzb@2026!`

## 质量检查

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint recommended-type-checked
npm run test          # jest
npm run test:cov      # jest --coverage（70% 阈值门禁）
npm run build         # nest build
```

## 已知遗留 / 下一阶段

- SAP / OA / COS 真实集成：当前为占位实现（`docs/INTEGRATION.md`）
- OpenTelemetry SDK + Pino 结构化日志：当前 traceparent 仅走中间件，OTel SDK 待接入
- Redis SETNX 替代进程内幂等锁：当前在 `IdempotencyInterceptor.inFlight` Map（标了 `ponytail:` 上限注释）
- 业务表单 8 套专用 zod schema：当前用 `passthrough` + `*Cents` 整数分校验，按真实表单字段后续再切
- 文件上传 driver：当前 local 落盘 + 签名 URL，Cos/S3 driver 待补
- Prisma migrate 文件：本机无 PostgreSQL，未生成 migrations；schema 已 `prisma validate` 通过

接口字段与错误码以 `../docs/API.md` 为唯一契约。
