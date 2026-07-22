# 销卓宝 · 产品原型 & 工程

> 卓宝销售工作台（移动端）— 高保真原型 + 工程化实现
> 文档版本：v1.1 · 2026-07-21

---

## 当前状态（2026-07-21 · v1.1）

| 方向 | 技术栈 | 状态 | 入口 |
|---|---|---|---|
| **v2 原型** | 纯 HTML / CSS / JS | **封版**，不再改动 | `index.html` |
| **v3 前端** | uni-app + Vue 3 + TypeScript | **开发中**（Codex 负责） | `v3-uniapp/` |
| **v3 后端** | NestJS + PostgreSQL + Prisma | **开发中** | `server/`（用户分支） |
| **v3 后台** | Refine + React + Ant Design | 待立项 | 独立仓库 |

---

## v1.1 文档升级说明

**背景**：v3 三件套（API / BACKEND / FRONTEND）封版后，进行了一次内部评审。评审列出 15 项问题，覆盖 P0 / P1 / P2 三个等级。v1.1 是评审的闭环。

### v1.0 → v1.1 核心变更

| 区域 | 变更 | 影响 |
|---|---|---|
| 错误码 | 独立业务码段（1xxxx/2xxxx/4xxxx/5xxxx） · 与 HTTP 解耦 | 前后端对齐 |
| 主键策略 | 统一 cuid，业务号（bp/no）降为 unique | DB migration 重设计 |
| 金额 | DB BigInt · API 字符串 · 前端 decimal.js | 防 JS 精度丢失 |
| 写幂等 | POST/PATCH/DELETE 强制 `Idempotency-Key` | 关键业务闭环 |
| 读缓存 | 端点级 `Cache-Control` + Redis key 规则 | 性能基线 |
| 乐观锁 | Order/Product/Aftersale/BizSubmission 加 `version` | 防止并发冲突 |
| 链路追踪 | W3C `traceparent` 替代 16 位 UUID | OTel 跨服务贯通 |
| 分页 | 高 page 切 cursor 分页 | 大数据量可用 |
| 集成策略 | SAP/OA/COS/微信支付 完整边界 + 重试 + DLQ | 最大风险点闭环 |
| 可观测性 | Pino 字段集 + OTel + Prometheus + Alertmanager | 运维基线 |
| 合规 | 域名白名单 + ICP + TLS + 隐私协议 + 多端体验 | 上线前必备 |
| 后台 | Refine 模块清单 + 报表 + 导出 + 权限矩阵 | 后台范围明确 |
| CI/CD | GitHub Actions：lint → typecheck → test → build → docker | 自动化基线 |

### 评审闭环状态

| 编号 | 问题 | 落地文档 |
|---|---|---|
| P0-1 | 错误码混淆 HTTP | `API.md` §0 · `BACKEND.md` §11 |
| P0-2 | PK 策略混搭 | `BACKEND.md` §3 |
| P0-3 | BigInt 精度坑 | `API.md` §3 · `FRONTEND.md` §6 |
| P0-4 | 缓存/幂等缺 | `API.md` §6 · §7 |
| P0-5 | 软删除空喊 | `BACKEND.md` §3 · §10 |
| P1-6 | traceId 协议 | `API.md` §1 · `OPERATIONS.md` §1 |
| P1-7 | schema 同源无机制 | `FRONTEND.md` §2 · monorepo 方案 |
| P1-8 | Observability 缺一半 | `OPERATIONS.md` §1-3 |
| P1-9 | CI/CD 全缺 | `OPERATIONS.md` §4 |
| P1-10 | 状态机没画 | `BACKEND.md` §X · `ADMIN.md` §4 |
| P2-11 | 后台空缺 | `ADMIN.md` 全篇 |
| P2-12 | 微信合规未提 | `COMPLIANCE.md` §1 · §5 |
| P2-13 | 多端体验差异 | `COMPLIANCE.md` §4 · `FRONTEND.md` §5 |
| P2-14 | 乐观锁缺 | `BACKEND.md` §3 · `API.md` §8 |
| P2-15 | SAP/OA 适配一句话 | `INTEGRATION.md` 全篇 |

---

## v2 · 封版原型

- **文件**：`index.html`（125 KB · 单文件完整原型）
- **快照**：`preview-dashboard.png`
- **状态**：冻结，作为视觉基线参照，不接受任何修改
- **本地预览**：`python -m http.server 8900` → `http://127.0.0.1:8900`
- 详见 `index.html` 顶部注释与 `preview-dashboard.png`

> `index-3.html` 是 v2 的拷贝，仅作历史标记，请勿使用。

---

## 文档导航（v1.1 · 8 件套）

### 核心契约

| 文档 | 受众 | 内容 |
|---|---|---|
| `docs/API.md` | 前后端共用 | REST 契约全表 · 字段变更需联动 |
| `docs/BACKEND.md` | 后端开发 | 技术栈 / 模块地图 / Prisma schema / 鉴权 / 状态机 |
| `docs/FRONTEND.md` | 前端开发 | 技术栈 / 目录 / 路由 / 设计令牌 / 状态 / API 层 / 多端 |

### v1.1 新增

| 文档 | 受众 | 内容 |
|---|---|---|
| `docs/INTEGRATION.md` | 后端开发 | **SAP / OA / COS / 微信支付 / Redis / BullMQ 集成边界** · 字段映射 · 重试 · DLQ |
| `docs/OPERATIONS.md` | SRE · DevOps | **Pino 日志 · OTel · Prometheus · Alertmanager · CI/CD · 部署 · 备份** |
| `docs/COMPLIANCE.md` | 上线负责人 | **域名白名单 · TLS · ICP · 隐私协议 · 多端体验差异 · 上线检查** |
| `docs/ADMIN.md` | 后台开发 | **Refine 架构 · 10 实体 CRUD · 8 业务表单 · 报表 · 导出 · 权限矩阵** |

### 阅读建议

| 你是谁 | 先读 | 再读 |
|---|---|---|
| 后端开发 | `BACKEND.md` | `API.md` → `INTEGRATION.md` → `OPERATIONS.md` |
| 前端开发 | `FRONTEND.md` | `API.md` → `COMPLIANCE.md` §4 多端 |
| 后台开发 | `ADMIN.md` | `BACKEND.md` → `API.md` |
| 上线 / 运维 | `COMPLIANCE.md` | `OPERATIONS.md` → `INTEGRATION.md` §7 |
| 产品 / PM | `COMPLIANCE.md` §5 | `BACKEND.md` §模块地图 |

---

## 设计基线（来自 v2 锁定）

主色锁定：

| 变量 | 色值 | 用途 |
|---|---|---|
| 深墨 | `#0E1419` | 主品牌色 / 文字 |
| 朱砂红 | `#E8542C` | 强调 / 状态 / AI 入口 |
| 暖白 | `#FAF7F2` | 背景 |
| 蓝 | `#2E5A88` | 业务分类：项目 / 备货 |
| 绿 | `#2E7D5B` | 业务分类：发货 / 补贴 / 成功 |
| 金 | `#B07F1F` | 业务分类：广告 / 客诉 |
| 灰 | `#5B6470` | 知识库 |
| 银 | `#8A95A3` | 跟进 |

**签名元素**：2 px 朱砂红档案标签条（卡片左侧，激活时变 3 px）。不要在 v3 里丢掉这个签名。

字体：Space Grotesk（标题/数字）+ Inter（正文）+ JetBrains Mono（数字/编号）+ Noto Sans SC（中文）。

圆角：2 px 微圆角（节制感，不甜腻）。

> **不要用 emoji** 替代图标。图标统一用 TDesign 自带或 Iconify。

---

## 验收路径

v2 验收：Chrome / Edge 打开 `index.html`，5 栏底部 tabbar 切换 + 34 路由内交互。

v3 验收（前端）：
- `npm run dev:h5` 跑通，桌面浏览器套手机壳预览
- `npm run dev:mp-weixin` 跑通，微信开发者工具扫码预览
- 5 部真机（iOS + Android）跑通 34 路由

v3 验收（后端）：
- `npm run start:dev` + `npm run test` 全绿
- 前端 `USE_MOCK=false` 后首页加载真数据
- Swagger `/api/v1/docs` 列出全部接口
- SAP/OA mock 跑通（`INTEGRATION.md` §8.1）

v3 验收（运维 / 上线）：
- `OPERATIONS.md` §4 CI 全绿
- `COMPLIANCE.md` §5 上线检查清单全部勾选
- `COMPLIANCE.md` §1 域名白名单配置生效

---

## 最大风险提示

| 风险 | 影响 | 缓解 |
|---|---|---|
| **SAP / OA 集成** | 30-50% 项目时间 | 提前 2 周与 SAP 顾问对齐字段；详见 `INTEGRATION.md` |
| **微信小程序上线** | 1-3 周备案/审核 | 提前准备 ICP 资料；详见 `COMPLIANCE.md` §1-2 |
| **大金额精度** | 全链路 | BigInt + 字符串 + decimal.js；详见 `API.md` §3 |
| **并发冲突** | 库存/审批 | 乐观锁 + 事务；详见 `API.md` §8 · `BACKEND.md` §3 |

---

## 工作量估算（你 + Codex）

| 阶段 | 周期 |
|---|---|
| 文档细化 + monorepo + 错误码 + CI | 3-5 天 |
| 后端骨架（NestJS + Prisma + 鉴权 + 字典 + Alova） | 1-1.5 周 |
| 后端业务 10 模块 | 3-4 周 |
| 前端 34 路由（uni-app） | 4-6 周 |
| 后台 Refine + shadcn | 2-3 周 |
| 部署 + 备案 + 监控 + 压测 | 1-2 周 |
| SAP / OA 集成 | **3-6 周（最大变量）** |

- **MVP（不含 SAP）**：6-10 周
- **全功能**：10-16 周
- **全职 3-5 人 + Codex**：可压到 4-6 周

---

## 已知调试痕迹

- `index.html` 使用 UTF-8 BOM 编码（PowerShell `Set-Content -Encoding UTF8` 默认行为），Chrome / Edge 正常渲染。如用更严格的解析器出现乱码，用 VSCode 改 `UTF-8` 无 BOM。
- `v3-next/` 是早先 Next.js + R3F 尝试的产物，**已弃用**，仅作历史参考**不再维护**。
- `v3-uniapp` 当前 dev server 在 `8080` 端口（5173 端口的旧 PID 杀不掉，绕开）。

---

**文档版本**：v1.1 · 2026-07-21
**配套文档**：见 `docs/`（8 件套）