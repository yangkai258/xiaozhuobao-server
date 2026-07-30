# HANDOFF · v3.0.5 前端联调收尾 + AI 多会话

> 2026-07-30 by Codex desktop
> 适用于后续前端会话、人工 review、PR #1 评审

## 1. 当前状态

| 项目 | 值 |
| --- | --- |
| 分支 | `codex/v3.0.3-hardening` |
| 工作区根 | `C:\Users\YKing\Documents\销卓宝` |
| 前端包 | `v3-uniapp`（uni-app 3.0 + Vue 3.4 + Pinia + TS + Vite） |
| 后端包 | `server`（NestJS 10 + Prisma） |
| 最近提交 | `fbb908d chore(v3-uniapp): 前端联调收尾 + AI 多会话` |
| 已推送 | 是（HEAD `fbb908d`） |
| Draft PR | https://github.com/yangkai258/xiaozhuobao-server/pull/1 |
| Base 分支 | `codex/server-v3` |
| 服务器 pid | `:4000` 后端、`:8080` 前端静态（开发期） |

## 2. 已落地（v3.0.5）

### 2.1 基建
- `v3-uniapp/vite.config.ts`：开发环境 `/api` → `http://localhost:4000`；`VITE_API_BASE_URL` inject
- `v3-uniapp/.env.example` / `.env.development` / `.env.production`
- 删除临时 `dev-serve.js`

### 2.2 API 客户端（`src/api/client.ts`）
- BASE 兼容空 / `/` / 跨域三种场景
- 重要 POST 自动注入 `Idempotency-Key`
- 401 → 单飞 `/auth/refresh` → 失败 reLaunch 到 `/pages/login/index`
- 订单 / 商品大数金额用 `formatCents`，移除 `Number(BigInt)/100` 精度风险
- 状态机 PATCH 自动带 `If-Match`，返回 10009 时前端自动重新拉取

### 2.3 公共 composables
- `composables/useSubmit`：提交锁 + 限流 rearm 1.5 秒 + 401 透传
- `composables/useRetry`：loading / error / abort / reload

### 2.4 错误码（`src/utils/error.ts`）
新增 20105 / 10008 / 10009 / 20428 / 40000 / 40001 / 40002；`isVersionConflict` 兼容 10001 / 10009。

### 2.5 页面
- 详情页 `order/aftersale/customer/product/contract/project` 全部走 composables，删除硬编码 try/catch
- `login`：`useSubmit({rearmMs:3000})`，成功清空密码
- 8 个 biz 新建页（advert/meeting/subsidy/complaint/stocking/store/rental/shipment）`:run(api_biz.create(...))`

### 2.6 AI（PRD v1.0 范围部分落地）
- 新增 `stores/chat.ts`：多会话 + 持久化 + AI invoke + 附件上传 + 自动标题
- `components/ChatComposer`：拍照 / 选文件 → `api_storage_ai.upload`（H5 用 base64，小程序走原生）
- `components/SessionDrawer`：会话列表 / 新建 / 删除
- `pages/ai` 切到 `useChatStore`、首屏自动 `newSession()`
- 新页 `pages/ai-kb`（知识库问答）+ `pages/ai-upload`（文档上传）
- `pages.json` 重写干净，注册 22 个 page，tabBar 5 + midButton

## 3. 验证

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| TypeScript | `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit` | error TS 计数 = 0 |
| H5 构建 | `node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build` | 产物 `dist/build/h5/index.html` mtime 2026-07-30 01:16 |
| 后端（worker PR） | 后端分支独立评审 | 未触碰 |

## 4. 未做（不在本次范围）

- AI 客商草稿回填：项目无 `customer-new` 页；识别 ToolDraft 仅展示字数提示
- 微信小程序构建 / 真机适配 / 拍照权限 / 隐私协议 / 域名白名单
- 全页面 Puppeteer / 真机回归（之前 P0 已过 0 console error，本批改动后未跑回归）
- `v3-uniapp/pages.json` 仅用英文导航标题（防 mojibake），后续需补回中文
- 后端硬化 10 工单 + `docs/backend/v3.0.3.md` §2–§10 的 1+9 后端文档（commit `755e27f` 之前已落地，`.gitignore` 未忽略，仍 dirty）

## 5. 仍 dirty 的工作区文件

```
M  server/.env.example
M  server/package-lock.json
M  server/package.json
M  server/src/app.module.ts
A  server/src/common/throttler/global-throttler.guard.ts
M  server/src/config/env.ts
M  server/src/modules/ai/ai.controller.ts
M  server/src/modules/auth/auth.controller.ts
A  server/test/throttler.e2e-spec.ts
A  docs/backend/v3.0.3.md
```

> 这些不属于 v3.0.5。等用户单独开 PR / 提交。**不要** 让它们混进 `fbb908d` 之后的提交。

## 6. 下一步

按用户当前态度处理：
1. **review PR #1** → 是否转 Ready → 是否 merge 到 `codex/server-v3`
2. **后端硬化 10 工单** → 给后端人去 `server/` 与 `docs/backend/v3.0.3.md` 写独立 PR
3. **下一个迭代（v3.0.6 / v3.1.0）**：AI 多模态、多会话持久化、微信小程序交付、SAP/OA 集成

## 7. 已知坑（落地期间反复踩）

- `shell_command` 单次 `cmd` ≤ 2KB；超长脚本必须写到临时文件再跑
- PowerShell 在写入 UTF-8 中文时容易把字节流打散成十进制 ASCII；**校验时用 node 读 size + head hex**
- `pages.json` 中增量修改容易破坏末尾 `}`；如不放心，整文件重写
- 中文导航标题在 PowerShell 流水线里会被 mojibake，先用 ASCII 占位等 review
- Vue tsc / uni build 在 PowerShell 里有时 stdout 截断，**验证必用 node 写日志文件 + type 读取**
- 写文件统一用 `fs.writeFileSync(p, body, 'utf8')` 别用 PowerShell `Set-Content`

---
