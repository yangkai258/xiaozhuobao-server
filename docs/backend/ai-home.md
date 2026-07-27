# AI 对话首页 · 后端对接需求 v1.0

> 关联：
> - PRD：`docs/prd/ai-home.md`
> - 设计规格：`docs/design/ai-home.md`
> - 模块设计：`docs/modules/ai-home.md`
> - 前端工程：`docs/frontend/ai-home.md`
> - API 契约：`docs/API.md`

---

## 0 · 文档元信息

| 项 | 值 |
| --- | --- |
| 版本 | v1.0 |
| 起草 | 2026-07-27 |
| 视角 | 前端 → 后端（反向 PRD） |
| 阶段 | 阶段一（零新增）/ 阶段二 / 阶段三 分层 |
| Owner | 后端 + AI 服务 |

---

## 1 · 总览：阶段一零新增、阶段二再加

| 阶段 | 前端新增 | 后端端点 | 后端数据 | 后端模型 |
| --- | --- | --- | --- | --- |
| 一 | 13 组件 + 2 composables + 1 store + 2 util + 1 types | 0 个新端点；只用既有 `/ai/:module/invoke` + `/storage/upload` + 列表查询 | 0 个新表；复用既有 `ai_*` mock | 0 个新模型 |
| 二 | DB 持久化 + 抽屉数据 + 跟进助手 | 新增 `/ai/conversations/*`、`/ai/dynamics`、`/kb/search` | 新增 `ai_conversation` / `ai_message` / `ai_attachment` / `kb_*` | 新增模型 |
| 三 | 会话绑业务单 + 群组总结 + Refine 报表 | 新增 `/ai/fanout/*` + Refine 报表端点 | 新增 `ai_fanout` / `refine_*` | 新增模型 |

> 阶段一**严禁**新增后端表 / 端点 / 模型；所有变更走代码层。

---

## 2 · 现有端点（已就绪，无需新增）

### 2.1 鉴权链路

| 端点 | 用途 | 状态 |
| --- | --- | --- |
| `POST /auth/login` | 用户名密码登录 | OK |
| `POST /auth/refresh` | 刷新 access token | OK |
| `POST /auth/logout` | 注销 | OK |
| `GET /me` | 当前用户基本信息 | OK |
| `GET /me/utilities` | 当前用户的工具入口 | OK |
| `GET /me/reports?period=...` | 当前用户业绩 / KPI | OK |

### 2.2 业务数据

| 端点 | 用途 | 状态 |
| --- | --- | --- |
| `GET/POST/PATCH /customers` | 客户 | OK |
| `GET/POST/PATCH /projects` | 项目 | OK |
| `GET/POST/PATCH /contracts` | 合同 | OK |
| `GET /products` 与 `PATCH /products/:id/stock` | 商品 / 库存 | OK |
| `GET/POST /orders` 与 `PATCH /orders/:id/status` | 订单 | OK |
| `GET/POST /aftersales` 与 `PATCH /aftersales/:id/status` | 售后 | OK |
| `GET/POST/PATCH /biz` 系列 | 业务表单 | OK |
| `GET/POST /follow/todos` 与 `/follow/todos/:id/{done,cancel}` | 待办 | OK |
| `GET /dicts?kind=...` | 字典 | OK |
| `POST/GET /storage/upload` + `/storage/sign-url` + `/storage/files/*` | 文件存储 | OK |

### 2.3 AI 模块

| 端点 | 用途 | 状态 |
| --- | --- | --- |
| `GET /ai/modules` | 模块清单 | OK |
| `POST /ai/:module/invoke` | 单回合调用 | 需扩展（见 §4） |
| `GET /ai/:module/history` | 模块历史 | OK |

---

## 3 · 现有端点需要扩展 / 确认

### 3.1 `POST /ai/:module/invoke`（关键）

**当前契约**（`docs/API.md:957`）：

```json
POST /ai/:module/invoke
{ "prompt": "...", "context": {...} }
```

**前端需求扩展**：

```json
{
  "prompt": "...",
  "context": {...},
  "attachments": [
    { "fileId": "abc123", "kind": "image" | "file" }
  ],
  "intentHints": ["customer_qualification" | "data_query" | "kb_query" | "draft"]
}
```

**响应扩展**：

```json
{
  "code": 0,
  "data": {
    "reply": "...",                       // 自然语言短答
    "toolCalls": [
      {
        "id": "tc-1",
        "type": "customer_qualification" | "data_query" | "kb_reply" | "draft" | "submit",
        "args": {...},
        "preview": {...}                  // 给前端的轻量渲染提示
      }
    ],
    "citations": [...],                    // 知识库出处，可选
    "similarCases": [...],                 // 历史相似，可选
    "nextActions": [...]                   // 建议动作，可选
  }
}
```

**要求**：
- `attachments` 为空时，原契约保持兼容。
- 至少 `customer_qualification`、`data_query`、`kb_reply`、`draft`、`submit` 5 种 type 返回。
- `attachments.length > 0` 时**必须**走多模态路径，**不允许**降级为纯文本。

### 3.2 `POST /biz/:kind`

**当前契约**（`docs/API.md:854`）：写入业务表单。

**前端需求确认**：
- 阶段一不需要新增 `draft` kind；继续用既有 `kind`。
- 需要确认响应 201 + `id` / `no` 可在前端用以跳详情页。

### 3.3 `POST /storage/upload`

**当前契约**（`docs/API.md`）：返回 `{ fileId, url }`。

**前端需求确认**：
- 接受 `multipart/form-data`，包含 `file` + `kind`（image/file）。
- 响应建议改为 `{ fileId, url, mime, size, name }`。
- 失败细分码：
  - 413 文件过大
  - 415 文件类型不支持
  - 503 后端存储不可用

### 3.4 `GET /orders`、`GET /aftersales`（列表查询）

**前端需求**：
- 阶段一在前端做 N+1（按客户 ID 多次查询），但希望后端能提供组合查询接口：
  - `GET /orders?customer=...&dateFrom=...&dateTo=...&status=...`
  - 返回时把 `customerName`、`amtCents` 等扁平字段一起返。
- 默认 size 由 20 提升至 50（AI 查询场景）。
- 增加 `GET /orders/summary?customer=...` 返回 `{ gmv, count, pending }` KPI。

### 3.5 `GET /dicts?kind=...`

**前端需求**：在对话中可能需要动态显示"行业 / 客户类型 / 信用等级"等字典。确认 `kind` 接受的值（客户状态、订单状态、商品类型、信用等级）。

### 3.6 `GET /me/reports`

**前端需求**：返回字段 `gmvCents` / `orderCount` / `aftersaleCount` / `completion` / `byWeek` 已够用；阶段一无需扩展。

### 3.7 错误码

| 业务码 | 处理 | 现状 |
| --- | --- | --- |
| 10009 版本不一致 | tool 卡显示「版本不一致 · 刷新」 | 已就绪 |
| 10404 资源不存在 | tool 卡显示「资源不存在 · 重新发起」 | 已就绪 |
| 20100/20104 鉴权 | AuthNotifier reLaunch 登录 | 已就绪 |
| 5xxxx 业务错误 | AI 气泡红边显示 | 已就绪 |
| 0 网络错误 | composer 红条 | 已就绪 |

**新增需求**（建议后端补码表）：

| 业务码 | 含义 | 前端处理 |
| --- | --- | --- |
| 50301 | 多模态识别失败 | ToolRecog 显示「识别失败 · 再来一张」 |
| 50302 | 多模态超时（>5s） | 同上 |
| 50401 | 文件上传失败 | 单附件 chip 红 + 「重传」 |
| 50402 | 文件过大 | 「文件超过 8MB」 |
| 50403 | 文件类型不支持 | 「仅支持 png/jpg/pdf」 |
| 50501 | 知识库未命中 | ToolKb 显示「没找到匹配 · 换关键词」 |
| 50601 | 业务写前置校验失败 | 弹 modal 重填 |

---
## 4 · 数据结构需求（阶段二起新增）

### 4.1 AI 会话持久化（阶段二）

```prisma
model AiConversation {
  id         String   @id @default(cuid())
  userId     String
  title      String   @default("")
  pinnedAt   DateTime?
  deletedAt  DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([userId, updatedAt])
}

model AiMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           String   // "user" | "assistant" | "system"
  contents       Json     // MsgContent[] 同 docs/design/ai-home.md §11
  attachments    Json?    // [{ fileId, kind }]
  toolCalls      Json?    // ToolCall[] 同 design §11
  createdAt      DateTime @default(now())
  @@index([conversationId, createdAt])
}

model AiAttachment {
  fileId    String   @id
  userId    String
  mime      String
  size      Int
  name      String
  storageKey String
  createdAt DateTime @default(now())
  expiresAt DateTime
  @@index([userId, createdAt])
}
```

阶段二前端需要的端点：

| 端点 | 用途 |
| --- | --- |
| `POST /ai/conversations` | 新建会话，返回 id |
| `GET /ai/conversations` | 列表（含今天/昨天分组） |
| `GET /ai/conversations/:id` | 单个会话（含消息） |
| `PATCH /ai/conversations/:id` | 重命名 / 固定 |
| `DELETE /ai/conversations/:id` | 删除（软删） |
| `POST /ai/conversations/:id/messages` | 追加消息（含 attachments） |

### 4.2 知识库（阶段二）

```prisma
model KbDocument {
  id        String   @id @default(cuid())
  title     String
  source    String   // "manual" | "import" | "internal_doc"
  version   String
  deletedAt DateTime?
  createdAt DateTime @default(now())
}

model KbSection {
  id         String   @id @default(cuid())
  documentId String
  heading    String
  body       String   // Markdown
  order      Int
}

model KbChunk {
  id        String   @id @default(cuid())
  sectionId String
  content   String   // 切分后的段落
  embedding Bytes?   // 可选：pgvector / 自研
  @@index([sectionId])
}
```

阶段二前端需要的端点：

| 端点 | 用途 |
| --- | --- |
| `POST /kb/search` | 检索：`{ query, topK }` → `{ items: [{ docId, title, snippet, score }] }` |
| `GET /kb/documents/:id` | 文档详情 |
| `GET /kb/sections/:id` | 段落详情 |
| `POST /kb/import`（Refine 端）| 上传 PDF / Markdown 自动切分 |

### 4.3 跟进助手（阶段二）

```prisma
model FollowAssistantTask {
  id        String   @id @default(cuid())
  userId    String
  kind      String   // "daily_digest" | "missed_follow" | "renewal_reminder"
  payload   Json
  triggeredAt DateTime
  read      Boolean  @default(false)
}
```

端点：

| 端点 | 用途 |
| --- | --- |
| `GET /follow/assistant` | 当前用户待办助手列表 |
| `PATCH /follow/assistant/:id` | 标记已读 |

### 4.4 引用映射（阶段三）

```prisma
model KbCitationLink {
  id         String  @id @default(cuid())
  messageId  String
  businessEntity String  // "customer" | "order" | "aftersale" | ...
  entityId   String
}
```

---

## 5 · 鉴权与多端

| 项 | 需求 | 现状 |
| --- | --- | --- |
| token 刷新单飞 | 401 单个 in-flight refresh | OK |
| traceparent 注入 | W3C 格式 | OK |
| CORS | 放行 mp-weixin 与 H5（已加 localhost:8080） | 需补充正式域名 |
| 设备差异 | H5 / mp-weixin / mp-alipay / App 一致体验 | OK |
| 多端登录互斥 | 销售员不会同时登录两台设备 | 不必处理 |

**需确认**：
- mp-weixin 域名白名单（生产）；当前仅开发 `localhost:8080`。
- TLS 1.2+ 与 ICP 备案：阶段一不阻塞，但需在阶段二前完成。

---

## 6 · 性能 / 缓存 / 限流

### 6.1 性能预算

| 端点 | P95 目标 |
| --- | --- |
| `POST /ai/:module/invoke`（无附件） | ≤ 4s |
| `POST /ai/:module/invoke`（带附件） | ≤ 6s |
| `POST /storage/upload` | ≤ 2s（4MB） |
| `GET /orders` / `GET /aftersales` / `GET /customers` | ≤ 300ms |
| `POST /biz/:kind` | ≤ 500ms |
| `POST /auth/login` | ≤ 800ms |

### 6.2 缓存

| 资源 | 策略 | key |
| --- | --- | --- |
| `/ai/modules` | 60s 内存缓存 | `ai:modules` |
| `/dicts?kind=...` | 5 分钟 | `dict:<kind>` |
| `/me/utilities` | 60s | `me:util:<userId>` |
| `/me/reports?period=...` | 5 分钟 | `me:report:<userId>:<period>` |
| `/biz/summary` | 60s | `biz:summary:<kind>` |
| `/storage/sign-url` | 不缓存（每次都签） | -- |

### 6.3 限流

| 端点 | 单用户限流 | 全局限流 |
| --- | --- | --- |
| `POST /ai/:module/invoke` | 60 次/分钟 | 1000 次/秒 |
| `POST /storage/upload` | 30 次/分钟 | 200 次/秒 |
| `POST /biz/:kind` | 30 次/分钟 | 500 次/秒 |
| `POST /auth/login` | 10 次/分钟/IP | -- |

### 6.4 幂等

`POST /ai/:module/invoke`、`POST /storage/upload`、`POST /biz/:kind` 必须支持 `Idempotency-Key`（已就绪）。

---

## 7 · 上传 / 多模态

### 7.1 上传文件类型白名单

| mime | 支持 | 用途 |
| --- | --- | --- |
| image/png | ✓ | 营业执照 / 产品照 |
| image/jpeg | ✓ | 同上 |
| image/webp | ✓（建议） | 节省流量 |
| application/pdf | ✓ | 知识库 / 文档 |
| text/plain | ✗ | 阶段一不做 |

### 7.2 大小限制

| 用途 | 上限 |
| --- | --- |
| 单张图 | 8MB |
| 单份 PDF | 8MB |
| 单条消息附件数 | 3 |
| 单条消息总附件 | 16MB |

### 7.3 生命周期

- 上传后未引用：24h 自动清理。
- 上传后被对话引用：保留到对话被删除后 24h。
- 客户/订单附件关联：永久保留（在业务记录里）。

### 7.4 客户端预处理

- 前端先压缩到长边 1080px。
- 去除 EXIF（前端用 Canvas 重画）。
- PDF 不压缩，直接上传。

---

## 8 · 知识库（阶段二）

### 8.1 检索接口

```http
POST /kb/search
Body: { "query": "JS 聚合物 5℃ 以下能不能施工?", "topK": 5 }
Response:
{
  "code": 0,
  "data": {
    "items": [
      {
        "docId": "kb-doc-001",
        "title": "涂无忧 · JS 聚合物操作手册",
        "sectionHeading": "§2.3 低温施工",
        "snippet": "施工温度应保持在 5℃ 以上...",
        "score": 0.87,
        "deepLink": "/pages/kb/view?id=...&section=...",
        "businessLinks": [
          { "kind": "order", "no": "SO20260112-005" }
        ]
      }
    ]
  }
}
```

### 8.2 知识库内容管理（Refine 端）

- 文档增删改查（CRUD）。
- 段落版本控制。
- 手动触发 embedding 重算。

### 8.3 兜底

- 知识库命中率 < 30% 时返 `{ items: [] }`，前端 ToolKb 显示「没找到匹配 · 换关键词」。

---

## 9 · AI 调用结构

### 9.1 调用约定

- 前端调用 `/ai/:module/invoke`，传 `module` 与 `attachments`。
- 后端按 attachments 走不同模型：
  - 无附件 → 单模态 LLM。
  - 1 张图 → 多模态（视觉）模型。
  - 1 份 PDF → 文档解析 + RAG。

### 9.2 模块清单（已有）

```
insight / quote / risk / after / kb / follow
```

**阶段一前端需要的隐式路由**（不是新增端点）：

| 用户意图 | 路由到 module | reason |
| --- | --- | --- |
| 拍照建客户 | `recog`（建议新增）或 `insight` | 多模态识别 |
| 查业绩 | `insight` | 数据分析 |
| 补资质 | `after` | 售后相关 |
| 问流程 | `kb` | 知识库 |
| 查跟进 | `follow` | 待办 |

**问题**：
- `recog` 不在现有 6 个 module 中。前端如果直接调 `/ai/recog/invoke` 会 404。
- 三个解决方向：
  - **A**：前端把所有意图路由到 `insight`，由后端二次分发（**推荐**）。
  - **B**：后端新增 `recog` module（**需 1 个新端点**）。
  - **C**：复用现有 6 个 module，靠 `attachments` 字段区分（**不推荐**，耦合）。

**建议采用 A**：扩展 `/ai/:module/invoke` 协议，让 `module=insight` + `attachments` 触发多模态路径。

---

## 10 · 监控 / 埋点

### 10.1 必埋事件

| 事件 | 触发位置 |
| --- | --- |
| `ai_invoke_started` | 收到前端 invoke 调用 |
| `ai_invoke_completed` | 调用成功（含 tool_calls） |
| `ai_invoke_failed` | 调用失败（code !== 0） |
| `ai_tool_call_dispatched` | 返回了 toolCalls |
| `kb_citation_clicked` | 用户点了出处（前端回传） |
| `biz_submit` | AI 触发了 /biz 提交 |

### 10.2 关键字段

- `traceId`（W3C traceparent）
- `userId`、`role`、`region`
- `module`、`attachmentsCount`
- `latencyMs`、`code`

### 10.3 报警阈值（建议）

| 指标 | 阈值 |
| --- | --- |
| AI 调用 P95 延迟 | > 6s 持续 5min |
| AI 调用错误率 | > 5% 持续 5min |
| 上传 P95 延迟 | > 3s 持续 5min |
| 知识库命中率 | < 30% 持续 1h |

---

## 11 · 部署 / 环境

### 11.1 dev / staging / prod

| 环境 | API 地址 | CORS |
| --- | --- | --- |
| dev | `http://localhost:4000` | 放行 `http://localhost:8080`（已就绪） |
| staging | 待定 | 待定 |
| prod | 待定 | 待定（含 mp-weixin 域名白名单） |

### 11.2 环境变量

后端读取：

- `PORT=4000`
- `DATABASE_URL=postgresql://...`
- `REDIS_URL=redis://...`
- `S3_ENDPOINT` / `S3_BUCKET` / `S3_KEY` / `S3_SECRET`（上传真实 OSS / COS / S3）
- `AI_PROVIDER=openai` / `anthropic` / `mock`
- `AI_MODEL_VISION=gpt-4-vision`（或对应国内模型）
- `AI_MODEL_TEXT=gpt-4o`（或对应国内模型）
- `RATE_LIMIT_AI=60/60s`
- `UPLOAD_TTL_HOURS=24`
- `FEATURE_AI_HOME=true`（灰度开关）

### 11.3 灰度开关

- `FEATURE_AI_HOME` 后端读，前端通过 `GET /feature` 拿。
- 默认 false → 前端降级回原 6 模块 AI 工作台。

---

## 12 · 风险与开放问题

| id | 问题 | 候选 | Owner |
| --- | --- | --- | --- |
| BQ-1 | AI 调用是否支持流式（SSE） | 否（阶段一） / 是（阶段二） | 后端 |
| BQ-2 | 知识库向量库选型 | pgvector / Elasticsearch / 自研 | 后端 |
| BQ-3 | /storage/upload 是否走真实 OSS / COS | 是 / mock | 后端 |
| BQ-4 | 多模态识别失败细分码 50301 / 50302 是否区分 | 否（合并） / 是 | 后端 |
| BQ-5 | 知识库文档 RAG 是否引入 chunking 服务 | 引入 / 后端自己切 | 后端 |
| BQ-6 | 跟进助手是同步生成还是异步（BullMQ） | 同步 / 异步 | 后端 |
| BQ-7 | AI 是否走 OpenAI 兼容协议 vs 自研适配器 | OpenAI 兼容 / 自研 | 后端 + AI |
| BQ-8 | 待办 / 智能推送是否要后端持久化 | 否（前端 memory） / 是 | 后端 |

---

## 13 · 验收清单

阶段一后端支持：

- [ ] `/ai/:module/invoke` 支持 `attachments[]`
- [ ] `/ai/:module/invoke` 响应扩展为 `{ reply, toolCalls, citations, similarCases, nextActions }`
- [ ] 多模态意图路由（拍照识别）能落到 `module=insight` + 1 张图
- [ ] `/storage/upload` 接受 image/png / image/jpeg / application/pdf ≤ 8MB
- [ ] `/storage/upload` 响应含 mime / size / name
- [ ] 错误码 50301 / 50401 / 50402 / 50403 / 50501 在 API.md 列出
- [ ] `/orders` / `/aftersales` 默认 size 提升到 50
- [ ] `traceparent` header 全链路透传
- [ ] Pino + Loki 接住 AI 调用事件
- [ ] 限流按 §6.3 配置
- [ ] H5 dev 联通：`vite proxy` + CORS

阶段二后端支持：

- [ ] `ai_conversation` / `ai_message` / `ai_attachment` 三表上线
- [ ] `/ai/conversations/*` 6 个端点
- [ ] `kb_document` / `kb_section` / `kb_chunk` 三表上线
- [ ] `/kb/search` 接入 RAG
- [ ] `/follow/assistant` 端点
- [ ] Refine 端 KB 文档管理 CRUD

---

## 14 · 与已有文档关系

| 文档 | 内容 |
| --- | --- |
| `docs/prd/ai-home.md` | 业务目标 / 用户故事 / 节奏 |
| `docs/design/ai-home.md` | 屏规格（含视觉） |
| `docs/modules/ai-home.md` | 模块拆分（端到端） |
| `docs/frontend/ai-home.md` | 前端工程栈 |
| `docs/backend/ai-home.md`（本文件）| 后端对接需求 |
| `docs/API.md` | API 契约总览 |