# 集成策略 · 销卓宝 v1.1

> 版本：v1.1 · 2026-07-21
> 受众：后端工程师、SRE、架构评审
> 范围：SAP（ERP）/ OA（审批流）/ COS（对象存储）/ 微信支付 / Redis / BullMQ 的集成边界、字段映射、失败重试、DLQ、离线兜底
> 对应：`docs/BACKEND.md` §10（外部依赖）· `docs/OPERATIONS.md`（告警/监控）

---

## 0. v1.1 变更摘要

| 区域 | v1.0 | v1.1 |
|---|---|---|
| 集成边界 | 一句话带过 | **每条集成都有契约表、字段映射、失败模型、重试策略、DLQ** |
| SAP RFC | 直接调用 | **同步走 OData / 异步走 IDoc + 队列解耦**；30 分钟定时 + 手动触发 |
| OA Webhook | 无验证 | **签名验证 + 时间戳 + nonce 防重放**；幂等表 24h |
| COS 直传 | 走后端中转 | **前端拿预签名 URL 直传 OSS**，后端只签不发流 |
| 微信支付 V3 | v2 模式 | **rsa 验签 + AES-256-GCM 解密回调**；回调幂等 |
| 缓存 | Redis 装了不知干啥 | **每端点 Cache-Control + Redis key 规则**（详见 API.md §10） |
| 队列 | BullMQ | **指数退避 1s/4s/16s/1m/10m**，3 次入 DLQ，飞书告警 |

---

## 1. 集成总览

```
┌─────────────────────────────────────────────────────────────────┐
│                    销卓宝 v1.1 集成边界图                          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   内 网 SAP            内 网 OA              公 网 微信
   (ERP 主数据)          (审批流)              (支付/登录/订阅)
        │                     │                     │
        │ RFC/OData           │ Webhook + REST      │ JSAPI/支付 V3
        │                     │                     │
   ┌────▼─────┐         ┌─────▼──────┐         ┌────▼────┐
   │ SAP 适配  │         │  OA 适配    │         │ 微信适配 │
   │ (30min   │         │ (回调+代理) │         │ (支付/登录)│
   │  定时)   │         │            │         │         │
   └────┬─────┘         └─────┬──────┘         └────┬────┘
        │                     │                     │
        │ 失败入 DLQ          │ 失败重放             │ 验签失败丢弃
        │                     │                     │
   ┌────▼─────────────────────▼─────────────────────▼────┐
   │               BullMQ (Redis) 异步任务队列              │
   │  · sap-sync-customer  · sap-sync-product              │
   │  · oa-callback-handler · wechat-pay-notify            │
   └──────────────────────┬──────────────────────────────┘
                          │
                  失败 3 次 → DLQ → 飞书告警 + 人工巡检
```

**所有集成失败 = 业务可降级，但用户必须看到提示。** 不允许静默失败。

---

## 2. SAP 集成（最大风险）

### 2.1 集成方式

| 维度 | 选择 | 理由 |
|---|---|---|
| 协议 | **OData V2**（主）+ **IDoc**（物料主数据增量） | OData 拉取适合定时轮询；IDoc 推送适合主数据变更 |
| 触发 | 30 分钟定时 + 手动触发 + 启动时全量 | 定时兜底，手动救急 |
| 调用方向 | 销卓宝 → SAP（拉） + SAP → 销卓宝（推 IDoc） | 单向数据流，便于重放 |
| 鉴权 | SAP 网关 OAuth2 Client Credentials | 短期 token 缓存，本地不落盘 |
| 网络 | 内网专线 / VPN | 不走公网 |

### 2.2 同步范围

| 实体 | 方向 | 频率 | 字段集 |
|---|---|---|---|
| 客户主数据 | SAP → 销卓宝 | 30 分钟 | BP 号、名称、层级、区域、税号、信用额度 |
| 物料主数据 | SAP → 销卓宝 | 30 分钟 | 物料号、名称、单位、价格、库存 |
| 价格条件 | SAP → 销卓宝 | 30 分钟 | 客户/物料/价格/有效期 |
| 销售订单 | 销卓宝 → SAP | 实时（订单提交后 1 分钟） | 单号、客户、物料、数量、单价、税额 |
| 库存可用量 | SAP → 销卓宝 | 5 分钟（高频） | 物料号、工厂、可用量 |
| 发票 / 收款 | SAP → 销卓宝 | 60 分钟 | 用于业绩核对 |

> 销卓宝**不**存财务主数据（凭证、应收应付），仅回写销售订单和拉取业绩数。

### 2.3 字段映射示例（Customer）

```typescript
// packages/integration-sap/src/mapping/customer.ts

export const customerFieldMap = {
  // SAP 字段       // 销卓宝字段         // 转换
  'BPNumber':       { target: 'bp',          type: 'string' },
  'Name1':          { target: 'name',        type: 'string' },
  'Name2':          { target: 'shortName',  type: 'string', optional: true },
  'Country':        { target: 'country',    type: 'string' },
  'Region':         { target: 'region',     type: 'string', enum: ['NORTH','EAST','SOUTH','WEST'] },
  'TaxNumber1':     { target: 'taxNo',      type: 'string', optional: true },
  'CreditLimit':    { target: 'creditCents', type: 'bigint', transform: yuanToCents },
  'SalesOrg':       { target: 'salesOrg',   type: 'string' },
  'DistributionCh': { target: 'channel',    type: 'string' },
} as const;
```

**单元测试要点**（每个映射都要覆盖）：
- null / undefined → optional 不抛错
- 类型不匹配 → 抛 `MappingError`（业务码 50201），不入库
- 货币小数位（SAP 用 DEC 2 位）→ 转 BigInt 分（cents）
- 字符编码（SAP 默认 GBK，部分字段 GB2312）→ 强制 UTF-8

### 2.4 失败模型

```typescript
export enum SapSyncErrorCode {
  NETWORK_TIMEOUT     = 'SAP_001',  // 网络超时 → 立即重试
  AUTH_FAILED         = 'SAP_002',  // 鉴权失败 → 刷新 token 后重试
  RATE_LIMITED        = 'SAP_003',  // SAP 网关限流 → 退避 1 分钟
  MAPPING_ERROR       = 'SAP_004',  // 字段映射错误 → DLQ（重试无用）
  BUSINESS_RULE       = 'SAP_005',  // SAP 业务校验失败 → DLQ + 飞书告警
  RESPONSE_MALFORMED  = 'SAP_006',  // 响应解析失败 → DLQ
}
```

### 2.5 重试策略

```
第 1 次失败 → 立即重试（瞬时错误）
第 2 次失败 → 退避 4 秒
第 3 次失败 → 退避 16 秒
第 4 次失败 → 退避 1 分钟
第 5 次失败 → 退避 10 分钟
第 6 次失败 → 入 DLQ + 飞书告警 + 人工处理
```

退避由 BullMQ `attempts` + `backoff` 自动实现，不写自定义调度：

```typescript
await sapSyncQueue.add('sync-customers', payload, {
  attempts: 6,
  backoff: {
    type: 'custom',
    delay: (attempt: number) => {
      const delays = [0, 4000, 16000, 60000, 600000];
      return delays[attempt - 1] ?? 600000;
    },
  },
  removeOnComplete: { age: 86400, count: 1000 },
  removeOnFail: false,
});
```

### 2.6 离线兜底

**SAP 全挂时**：
- 工作台展示"主数据同步延迟（最近一次：xx 分钟前）"横幅（红/橙色）
- 销售员可继续录单，本地暂存 Pinia IndexedDB
- 网络恢复后**不**自动重放（避免重复提交），需销售员手动点"重试"
- 后端对未同步订单打 `pendingSapSync` 标志，后台显示清单

---

## 3. OA 集成

### 3.1 集成方式

| 维度 | 选择 | 理由 |
|---|---|---|
| 协议 | **Webhook + REST 双向** | OA 推送审批事件，销卓宝拉审批模板 |
| 触发 | OA → 销卓宝（回调） + 销卓宝 → OA（提交/催办） | |
| 鉴权 | HMAC-SHA256 签名 + 时间戳 | 标准做法 |
| 防重放 | 时间戳 5 分钟窗口 + nonce 24h 记录 | 防中间人重放 |

### 3.2 Webhook 签名验证

```typescript
// packages/integration-oa/src/webhook.ts

import crypto from 'node:crypto';

export function verifyOaSignature(
  rawBody: Buffer,
  signature: string,
  timestamp: string,
  nonce: string,
  secret: string,
): boolean {
  // 1. 时间戳窗口检查（5 分钟）
  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  // 2. nonce 防重放（24h Redis）
  const key = `oa:nonce:${nonce}`;
  if (await redis.exists(key)) return false;
  await redis.setex(key, 86400, '1');

  // 3. 签名校验
  const payload = `${timestamp}.${nonce}.${rawBody.toString()}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### 3.3 审批事件流

```
OA 发起审批
   │
   ├─ 提交审批事件 ─→ 销卓宝创建 BizSubmission (status=SUBMITTED)
   │
   ├─ 审批通过事件 ─→ 销卓宝更新状态 (status=APPROVED) + 触发后续动作
   │
   ├─ 审批拒绝事件 ─→ 销卓宝更新状态 (status=REJECTED) + 通知发起人
   │
   └─ 审批撤回事件 ─→ 销卓宝更新状态 (status=CANCELED)
```

每种事件有独立 BullMQ worker 处理，避免阻塞。

### 3.4 失败重试

| 错误类型 | 重试策略 |
|---|---|
| 签名失败 | **不重试**（直接 401，避免算力浪费） |
| 字段缺失 | **不重试**（业务方错误，入 DLQ + 飞书告警） |
| 数据库连接失败 | 指数退避 3 次 → DLQ |
| 业务状态冲突（如审批已撤回） | **不重试**（业务码 10422） |

---

## 4. COS 对象存储

### 4.1 集成方式

**前端直传 + 后端预签**（不中转文件流）：

```
1. 前端请求后端 getUploadSignature(fileName, mime, size)
2. 后端校验大小/类型 → 调 COS getSignedUrl 返回
3. 前端 PUT 文件到 COS（直传）
4. 前端通知后端 confirmUpload(key) → 写 DB
```

### 4.2 安全策略

| 控制项 | 策略 |
|---|---|
| 上传类型 | 白名单：`image/jpeg`, `image/png`, `application/pdf`，最长 5 位扩展名校验 |
| 文件大小 | 图片 5MB，PDF 20MB，超限业务码 10413 |
| Bucket ACL | **私有读写**，前端拿临时签名 URL（5 分钟有效） |
| 文件命名 | `${userId}/${yyyyMMdd}/${uuid}.${ext}`，避免覆盖 |
| 删除策略 | 后端不做主动删除，统一走 lifecycle：90 天后转归档，1 年后清理 |
| 病毒扫描 | COS 触发 SCF（云函数）调用腾讯云 AV 扫描，结果回写 DB |

### 4.3 路径约定

| 业务 | 路径前缀 | 备注 |
|---|---|---|
| 用户头像 | `avatar/` | 单文件覆盖 |
| 售后凭证 | `aftersale/${aftersaleId}/` | 最多 9 张 |
| 订单附件 | `order/${orderId}/` | PDF / 图片 |
| AI 知识库 | `kb/${yyyyMM}/` | 文本文件 |
| 临时上传 | `tmp/${userId}/${uuid}.${ext}` | 24h 清理 |

---

## 5. 微信支付

### 5.1 集成方式

| 维度 | 选择 |
|---|---|
| 协议 | **微信支付 V3**（rsa 验签 + AES-256-GCM） |
| 支付场景 | 仅支持小程序内支付（JSAPI） |
| 回调 | 支付通知 + 退款通知 |
| 资金流 | **不走销卓宝**，仅做凭证和状态同步 |

### 5.2 鉴权与验签

```typescript
// packages/integration-wechat/src/pay.ts

export function verifyWechatPaySign(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  publicKey: string,
): boolean {
  const payload = `${timestamp}\n${nonce}\n${body}\n`;
  return crypto.verify(
    'RSA-SHA256',
    Buffer.from(payload),
    publicKey,
    Buffer.from(signature, 'base64'),
  );
}

export function decryptWechatPayResource(
  ciphertext: string,
  associatedData: string,
  nonce: string,
  key: Buffer,
): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAAD(Buffer.from(associatedData));
  // ... 省略 GCM auth tag 处理
  return decipher.update(ciphertext, 'base64', 'utf8') + decipher.final('utf8');
}
```

### 5.3 幂等保证

- 所有支付通知都走 BullMQ
- 用 `out_trade_no`（= 订单号）做幂等 key
- 已成功处理过的订单直接返 200 不再处理（防微信重试）

### 5.4 退款流程

```
销售员发起退款 → 后端校验订单 + 库存 + 退款金额
   │
   ├─ 校验通过 → 调微信退款 API (refundNo 唯一)
   │
   ├─ 微信异步通知 → 后端更新订单状态 (status=REFUNDED)
   │
   └─ 通知失败 → BullMQ 轮询（5 分钟）查单 + 飞书兜底
```

---

## 6. Redis 使用规范

### 6.1 用途分类

| 用途 | key 前缀 | TTL | 示例 |
|---|---|---|---|
| 鉴权 refresh token | `auth:rt:` | 30 天 | `auth:rt:userId-hash` |
| 接口幂等 | `idem:` | 24 小时 | `idem:userId-endpoint-hash` |
| Webhook nonce | `oa:nonce:` | 24 小时 | `oa:nonce:randomNonce` |
| 业务缓存 | `cache:` | 60 秒 | `cache:GET:/customers?page=1` |
| 分布式锁 | `lock:` | 10 秒 | `lock:order-no-XYZ` |
| 限流计数 | `rl:` | 60 秒 | `rl:userId-GET:/orders` |
| 在线状态 | `presence:` | 90 秒 | `presence:userId` |
| 排行榜 | `rank:` | 永久 | `rank:sales:2026Q3` |

### 6.2 key 命名规则

- 统一小写、冒号分层
- 业务码段位开头，便于按业务批量删除：`cache:order:list` / `cache:aftersale:list`
- 不允许序列化整个对象（除非体积 < 4KB），用 hash 结构

### 6.3 内存控制

- 单实例 ≤ 4GB
- maxmemory-policy: `allkeys-lru`（业务可降级）
- 监控 keyspace_misses_rate > 60% 时考虑扩容

---

## 7. BullMQ 队列清单

| 队列名 | 用途 | 并发 | 优先级 |
|---|---|---|---|
| `sap-sync-customer` | 客户主数据同步 | 4 | normal |
| `sap-sync-product` | 物料主数据同步 | 4 | normal |
| `sap-sync-inventory` | 库存实时同步 | 8 | high |
| `sap-push-order` | 订单推送 SAP | 4 | high |
| `oa-webhook` | OA 回调处理 | 8 | high |
| `wechat-pay-notify` | 支付通知 | 4 | high |
| `notification` | 站内信/推送 | 16 | low |
| `export` | 报表/导出 | 2 | low |
| `dlq-inspector` | DLQ 巡检 | 1 | low |

### 7.1 DLQ 飞书告警

```typescript
// packages/integration-queue/src/dlq-monitor.ts

await dlqQueue.add('inspect', {}, {
  repeat: { pattern: '*/30 * * * * *' }, // 每 30 秒
});

worker.on('failed', async (job, err) => {
  if (job.attemptsMade >= 6) {
    await feishuBot.send({
      msg_type: 'interactive',
      card: {
        header: { title: { tag: 'plain', content: `集成失败告警 · ${job.queueName}` } },
        elements: [
          { tag: 'div', fields: [
            { is_short: true, text: { tag: 'lark_md', content: `**Job**: ${job.id}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**错误码**: ${err.message}` } },
          ]},
          { tag: 'div', text: { tag: 'lark_md', content: `**堆栈**: ${err.stack?.slice(0, 500)}` } },
        ],
      },
    });
  }
});
```

---

## 8. 测试与演练

### 8.1 集成测试

- **Mock 服务**：用 `msw` 拦截 HTTP，模拟 SAP/OA/微信响应
- **契约测试**：用 Pact，验证销卓宝期望与 SAP 实际响应一致
- **故障注入**：用 toxiproxy 注入延迟/断连/5xx，验证重试和 DLQ

### 8.2 演练清单（每季度）

- [ ] SAP 断网 30 分钟，业务降级提示是否弹出
- [ ] SAP 返回畸形响应，是否入 DLQ 且不污染 DB
- [ ] OA Webhook 签名错误是否被拒
- [ ] OA Webhook 重放是否被 nonce 拦截
- [ ] COS 签名 URL 5 分钟后是否过期
- [ ] 微信支付重复通知是否幂等
- [ ] Redis 全挂时降级（直接打 DB，错误码友好）

---

## 9. 后续扩展位

- SAP 替代品（如未来不用 SAP）→ 抽象 `IntegrationAdapter` 接口
- 多 OA 厂商（钉钉、飞书审批）→ 同上抽象
- 多云 COS（腾讯云 → 阿里云）→ 通过环境变量切换 endpoint

---

## 10. 参考

- 微信支付 V3 文档：https://pay.weixin.qq.com/wiki/doc/apiv3/
- 腾讯云 COS 签名：https://cloud.tencent.com/document/product/436/7778
- BullMQ 重试：https://docs.bullmq.io/guide/retrying-failing-jobs
- OpenTelemetry 重试语义：https://opentelemetry.io/docs/specs/semconv/

---

## 11. 相关文档

- `docs/BACKEND.md` §10 外部依赖
- `docs/API.md` §10 缓存策略
- `docs/OPERATIONS.md` 告警规则与监控指标
- `docs/COMPLIANCE.md` ICP 备案与白名单