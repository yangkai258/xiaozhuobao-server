# 运维与可观测性 · 销卓宝 v1.1

> 版本：v1.1 · 2026-07-21
> 受众：SRE、DevOps、后端工程师
> 范围：日志（Pino + Loki）、指标（OTel + Prometheus）、告警（Alertmanager）、CI/CD、部署、备份
> 对应：`docs/BACKEND.md` §13 Observability · `docs/INTEGRATION.md` DLQ 告警

---

## 0. v1.1 变更摘要

| 区域 | v1.0 | v1.1 |
|---|---|---|
| 日志 | Pino 装了字段没定 | **标准字段集**：traceId / userId / route / latency / errorCode |
| 指标 | 列了但无定义 | **RED 指标 + 业务指标** 完整清单 |
| 告警 | 无 | Alertmanager 规则示例（错误率 / 延迟 / DLQ） |
| CI | 无 | GitHub Actions：lint → typecheck → test → build → docker |
| 部署 | 无 | 多环境：dev / staging / prod；k8s manifest |
| 备份 | 无 | DB 每日全量 + 6h 增量；恢复演练 |

---

## 1. 日志（Pino + Loki）

### 1.1 字段集（强制）

每条日志必须包含：

| 字段 | 类型 | 来源 | 必填 |
|---|---|---|---|
| `time` | ISO8601 | pino 内置 | 是 |
| `level` | info/warn/error/debug | pino 内置 | 是 |
| `traceId` | string (32 hex) | OTel context | 是 |
| `spanId` | string (16 hex) | OTel context | 是 |
| `userId` | string (cuid) | JWT 解出 | 是（如有） |
| `route` | string | request | 是 |
| `method` | string | request | 是 |
| `statusCode` | number | response | 是 |
| `latency` | number (ms) | 中间件计算 | 是 |
| `errorCode` | string | BizError | 错误时必填 |
| `errorMessage` | string | Error.message | 错误时必填 |

可选：userAgent、ip、bizType（订单/售后/审批）、entityId。

### 1.2 Pino 配置

```typescript
// packages/observability/src/logger.ts

import pino from 'pino';
import { trace, context } from '@opentelemetry/api';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    env: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME,
    version: process.env.GIT_SHA,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  mixin() {
    const span = trace.getSpan(context.active());
    if (!span) return {};
    const { traceId, spanId } = span.spanContext();
    return { traceId, spanId };
  },
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', '*.token'],
    censor: '[REDACTED]',
  },
});
```

### 1.3 HTTP 中间件自动记录

```typescript
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const latency = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info({
      route: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      latency,
      userId: req.user?.id,
      bizType: req.bizType,
    });
  });
  next();
});
```

### 1.4 Loki 推送

通过 promtail 抓取 stdout（容器化场景）或 sidecar 直推：

```yaml
# loki-config.yaml
scrape_configs:
  - job_name: xiaozhuobao
    static_configs:
      - targets: [localhost]
        labels:
          service: xiaozhuobao
          env: production
    pipeline_stages:
      - match:
          selector: '{service="xiaozhuobao"}'
          stages:
            - json:
                expressions:
                  level: level
                  traceId: traceId
                  route: route
            - labels:
                level:
                route:
```

### 1.5 日志保留

- 热存储 7 天（Loki）
- 冷存储 30 天（S3 压缩 parquet）
- 90 天后清理（合规要求见 `docs/COMPLIANCE.md`）

---

## 2. 指标（OpenTelemetry + Prometheus）

### 2.1 RED 指标（所有 HTTP 路由自动产生）

```
http_server_requests_total{method,route,status}        # Counter
http_server_request_duration_seconds_bucket{method,route,le}  # Histogram
http_server_requests_in_flight{method,route}          # Gauge
```

### 2.2 业务指标

| 指标名 | 类型 | 说明 |
|---|---|---|
| `orders_created_total` | Counter | 订单创建数，按 region / channel 标签 |
| `orders_status_transition_total` | Counter | 状态跃迁，按 from / to 标签 |
| `aftersales_open_total` | Gauge | 待处理售后 |
| `inventory_alerts_total` | Counter | 库存预警触发次数 |
| `sap_sync_duration_seconds` | Histogram | SAP 同步耗时，按 entity 标签 |
| `sap_sync_failures_total` | Counter | SAP 同步失败次数 |
| `cache_hit_ratio` | Gauge | Redis 缓存命中率 |
| `wechat_pay_amount_yuan_total` | Counter | 微信支付金额（元） |
| `dlq_depth` | Gauge | DLQ 队列长度 |
| `active_users_daily` | Gauge | 日活 |

### 2.3 OTel SDK 初始化

```typescript
// packages/observability/src/otel.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  serviceName: process.env.SERVICE_NAME,
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
  metricReader: new PrometheusExporter({ port: 9464 }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
```

### 2.4 暴露端点

- `/metrics` — Prometheus 抓取（端口 9464）
- `/health` — liveness
- `/ready` — readiness（依赖 Redis/DB 可用）

---

## 3. 告警（Alertmanager）

### 3.1 规则（prometheus rules）

```yaml
groups:
  - name: xiaozhuobao-slo
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_server_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_server_requests_total[5m])) > 0.01
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "5xx 错误率 > 1%"
          description: "持续 5 分钟，路由: {{ $labels.route }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_server_request_duration_seconds_bucket[5m])) by (le, route)
          ) > 1.5
        for: 10m
        labels: { severity: warning }

      - alert: DLQGrowing
        expr: dlq_depth > 100
        for: 10m
        labels: { severity: critical }

      - alert: SapSyncFailures
        expr: increase(sap_sync_failures_total[1h]) > 10
        labels: { severity: warning }

      - alert: RedisMissHigh
        expr: rate(redis_keyspace_misses_total[5m]) / rate(redis_keyspace_hits_total[5m]) > 3
        for: 30m
        labels: { severity: warning }
```

### 3.2 通知渠道

| 级别 | 渠道 | 接收人 |
|---|---|---|
| critical | 飞书机器人 + 电话 | 值班 SRE |
| warning | 飞书机器人 | SRE 群 |
| info | 飞书机器人 | 群 |

### 3.3 值班

- 工作日 9:00-21:00 主值班
- 非工作时间 oncall（飞书值班表）
- PagerDuty 替代品：阿里云告警

---

## 4. CI/CD

### 4.1 GitHub Actions 流水线

```yaml
# .github/workflows/ci.yaml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  build:
    needs: [lint, typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm docker:build
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: registry.example.com/xiaozhuobao:${{ github.sha }}
```

### 4.2 质量门禁

| 检查项 | 阈值 | 失败动作 |
|---|---|---|
| ESLint | 0 error | PR 阻塞 |
| TypeScript strict | 0 error | PR 阻塞 |
| 测试覆盖率 | > 70% lines, > 60% branches | PR 阻塞 |
| Bundle 大小 | main < 500KB gzipped | 警告 |
| Lighthouse | score > 80 | 警告 |
| Cyclomatic complexity | 函数 < 15 | 警告 |

### 4.3 部署流程

```
PR 合并 → main
   │
   ├─ 触发 CI 构建镜像 → registry
   │
   ├─ 自动部署 staging
   │
   ├─ 冒烟测试（自动化）
   │
   └─ 手动触发生产（GitHub Actions workflow_dispatch）
```

- staging 部署后自动跑 e2e（puppeteer）
- 生产部署用蓝绿（k8s deployment 双副本切换）
- 回滚：保留前 3 个版本镜像，5 秒内切换

---

## 5. 部署

### 5.1 环境

| 环境 | 域名 | 部署 |
|---|---|---|
| dev | localhost:4000 / :8080 | 手动 |
| staging | staging.example.com | 自动（CI） |
| prod | api.example.com | 手动批准 + 蓝绿 |

### 5.2 资源（推荐起点）

| 服务 | CPU | 内存 | 实例数 |
|---|---|---|---|
| api-server (NestJS) | 1 | 2GB | 2 |
| ai-worker | 2 | 4GB | 2 |
| sap-worker | 1 | 2GB | 2 |
| refine-admin | 0.5 | 1GB | 1 |
| postgres | 2 | 8GB | 1 主 + 1 备 |
| redis | 1 | 4GB | 1 主 + 1 备 |
| rabbitmq/bullmq | 1 | 2GB | 1 |

### 5.3 数据库迁移

```bash
# 本地开发
pnpm prisma migrate dev

# 生产部署
pnpm prisma migrate deploy
```

- 迁移文件必须能向前兼容（老代码能跑新 schema）
- 大表 ALTER 必须分批（避免锁表）
- 详见 `docs/BACKEND.md` §11

### 5.4 配置管理

- 开发：`.env.local`（gitignore）
- staging/prod：环境变量 + Vault（如用）
- 密钥轮换：每季度一次，记录到运维日志

---

## 6. 备份与恢复

### 6.1 备份策略

| 数据 | 频率 | 保留 | 方式 |
|---|---|---|---|
| PostgreSQL 全量 | 每日 03:00 | 30 天 | pg_dump + S3 |
| PostgreSQL 增量 | 每 6 小时 | 7 天 | WAL 归档 |
| Redis | 每日 02:00 | 7 天 | RDB + S3 |
| COS | 实时 | 永久 | 多副本 |
| 配置 | 随代码 | git history | |

### 6.2 恢复演练（每季度）

```bash
# 演练脚本（staging 环境）
1. 停止应用
2. 删除 staging DB
3. 从备份恢复
4. 启动应用
5. 跑冒烟测试
6. 记录 RTO（目标 < 30 分钟）
```

RTO 目标：< 30 分钟
RPO 目标：< 6 小时

---

## 7. 容量与成本

### 7.1 容量预估（首年）

| 资源 | 用量 | 月成本 |
|---|---|---|
| API 请求 | 1M/月 | - |
| DB 存储 | 50GB | - |
| Redis 内存 | 2GB | - |
| COS 流量 | 100GB | - |
| COS 存储 | 500GB | - |

### 7.2 优化点

- Redis 命中率 > 80% → 减小 DB 压力
- 大表加索引 → 查询 P95 < 200ms
- 前端懒加载 → 首屏 < 1MB
- COS 走 CDN → 减小回源

---

## 8. 故障演练

每月一次：

- [ ] Pod OOM → 自动重启验证
- [ ] DB 主从切换 → 应用是否重连
- [ ] Redis 全清 → 缓存重建耗时
- [ ] SAP 断网 → 业务降级提示
- [ ] DLQ 积压 → 飞书告警

---

## 9. 相关文档

- `docs/BACKEND.md` §13 Observability
- `docs/INTEGRATION.md` DLQ 与告警
- `docs/COMPLIANCE.md` 数据保留与删除
- `docs/ADMIN.md` 操作审计