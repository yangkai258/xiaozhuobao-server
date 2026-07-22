# 前端开发文档 · 销卓宝 v1.1

> 版本：v1.1 · 2026-07-21
> 负责：Codex（前端）/ 用户（后端独立分支）
> 与本文档对应的根目录：`v3-uniapp/`
> 接口契约：`docs/API.md` (v1.1)
> 配套：`docs/INTEGRATION.md` · `docs/OPERATIONS.md` · `docs/COMPLIANCE.md` · `docs/ADMIN.md`

---

## 0. v1.1 变更摘要

| 区域 | v1.0 | v1.1 |
|---|---|---|
| 金额解码 | `Number` 直接接 | **统一 `decimal.js`** 解析字符串，避免大数精度丢失 |
| 错误处理 | 简单 try/catch | **业务码段位解码**（1xxxx/2xxxx/4xxxx/5xxxx）+ UI 分流提示 |
| Idempotency | 无 | **POST/PATCH/DELETE 自动生成 UUID v4** 作 `Idempotency-Key` |
| 类型同源 | TS 手写 zod schema | **monorepo + openapi-typescript** 从后端 Swagger 自动生成 |
| 多端场景 | 不区分 | **明确 三种 device mode**（sales-field / office-h5 / admin-pc） |
| 长连接 | 无 | **关键状态变更用轮询 3s**（v1.1）；v2.0 升 SSE / WebSocket |

---

## 1. 目标与范围

把现有高保真原型（`index.html` / `v3-next/`）实现为一个**可编译到微信小程序的生产级前端**，同时支持 H5 浏览器预览。

- 业务形态：销售管理移动工作台
- 用户：卓宝销售（外勤 + 桌面办公）
- 终端：**微信小程序**（主）+ **H5**（开发演示用）
- 不在范围：后台 PC（由 Refine 在独立仓库实现）

---

## 2. 技术栈

（v1.0 不变；新增 `decimal.js` + 移除 `marked` 类的库，按需引入）

| 类别 | 选型 | 版本 | v1.1 变更 |
|---|---|---|---|
| 框架 | uni-app | ^3.0 | — |
| 语言 | TypeScript | ^5.4 | — |
| 视图 | Vue 3 Composition API | ^3.4 | — |
| 构建 | Vite | ^5 | — |
| 状态 | Pinia | ^3 | — |
| 网络 | alova | ^3 | — |
| UI | TDesign Miniprogram | latest | — |
| 图标 | Iconify | — | — |
| 日期 | dayjs | ^1.11 | — |
| 校验 | zod | ^3 | — |
| **金额** | **decimal.js** | **^10** | **v1.1 新增** |
| Lint | ESLint + Prettier + stylelint | latest | — |
| 测试 | Vitest（单元） + Playwright（H5 e2e） | latest | — |

---

## 3. 项目结构（v1.1 monorepo 化）

### 3.1 第一阶段（当前）

```
v3-uniapp/
├── src/ ...                  # 见 v1.0
```

### 3.2 第二阶段（v1.1 推荐）— monorepo

后端分支到位后，建一个顶层 monorepo（独立仓库，不影响 v2 冻结）：

```
销卓宝-monorepo/
├── pnpm-workspace.yaml
├── packages/
│   ├── shared-types/         # zod schema + openapi-typescript 生成的 TS 类型
│   ├── ui-tokens/            # 设计令牌（SCSS 变量 + TS 字体/间距常量）
│   └── eslint-config/        # 共享 lint 规则
├── apps/
│   ├── v3-uniapp/            # 小程序前端（从当前 v3-uniapp 迁过来）
│   ├── v3-server/            # NestJS 后端（用户分支并过来）
│   └── v3-admin/             # Refine 后台（独立仓库，先做 mock）
├── openapi.json              # 后端 Swagger 导出 → 前端 openapi-typescript
└── package.json              # 顶层
```

**类型同源流程**：
1. 后端启动后 `npm run openapi:export` 把 NestJS Swagger 导出到 `openapi.json`
2. 前端 `cd apps/v3-uniapp && npm run types:gen` → `openapi-typescript ../openapi.json -o src/types/api.d.ts`
3. 前端 `src/api/*.ts` 改用 `import type { paths } from '@/types/api'` 取代手写 zod schema
4. zod schema 仍保留在 `shared-types/`，运行时校验由前端的 `@alova/adapter-uniapp` 拦截器完成

> monorepo **不是阻塞项**，MVP 阶段继续手写 zod schema 也行；接入后端成功后第一时间切。

---

## 4. 本地开发

（v1.0 不变；仅在 dev 启动脚本里增加 `tsx scripts/gen-types.ts` 步骤）

---

## 5. 路由与导航

（v1.0 不变；34 路由不变；tap 跳转待 v2 接入）

---

## 6. 组件约定

（v1.0 不变）

---

## 7. 设计令牌

（v1.0 不变）

---

## 8. 状态管理（Pinia）

（v1.0 不变）

---

## 9. API 层（v1.1 重写）

### 9.1 基础设置

`src/api/client.ts`：

```typescript
import { createAlova } from 'alova';
import { uniappRequestAdapter } from '@alova/adapter-uniapp';
import Decimal from 'decimal.js';

export const api = createAlova({
  baseURL: import.meta.env.VITE_API_BASE,
  ...uniappRequestAdapter(),
  timeout: 8000,
  interceptors: {
    onRequest: ({ config }) => {
      const token = uni.getStorageSync('user')?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // v1.1: traceparent（W3C）
        config.headers['traceparent'] = generateTraceparent();
      }
      // v1.1: POST/PATCH/DELETE 强制 Idempotency-Key
      if (['POST','PATCH','DELETE'].includes(config.method?.toUpperCase())) {
        config.headers['Idempotency-Key'] = uuid.v4();
      }
    },
    onResponse: async ({ data, response }) => {
      // v1.1 标准响应壳：{ code: <biz_code>, data, msg, traceId }
      if (typeof data?.code !== 'number') {
        return reject(new TransportError('响应格式错误'));
      }
      if (data.code !== 0) {
        return reject(new BizError(data.code, data.msg, data.traceId));
      }
      // v1.1: 金额字段字符串解码为 Decimal（schema-driven，见 src/types/amount.ts）
      return decodeAmounts(data.data, schema);
    },
  },
});
```

### 9.2 业务错误（v1.1 段位解码）

```typescript
// src/api/errors.ts
export class BizError extends Error {
  constructor(public code: number, msg: string, public traceId: string) { super(msg); }
}

export function getBizErrorHint(code: number): { level: 'info' | 'warn' | 'fatal'; userMsg: string } {
  if (code === 0) return { level: 'info', userMsg: 'ok' };
  if (code >= 10000 && code < 20000) return { level: 'warn', userMsg: translate(code) };     // 业务
  if (code === 20100) { logout(); return { level: 'fatal', userMsg: '未登录' }; }
  if (code === 20101) return { level: 'fatal', userMsg: '用户名或密码错误' };
  if (code === 20103) return { level: 'fatal', userMsg: '当前角色无权限' };
  if (code === 20104) return { level: 'info', userMsg: '会话已过期，请重新登录' }; // 自动跳登录
  if (code >= 40000 && code < 50000) return { level: 'warn', userMsg: '请求错误' };
  if (code >= 50000) return { level: 'fatal', userMsg: '服务暂不可用，请稍后重试' };
  return { level: 'info', userMsg: '未知错误' };
}
```

UI 层统一拦截：

```typescript
// src/api/global-handler.ts
import { getBizErrorHint } from './errors';

export function setupGlobalApiErrorHandler() {
  api.onError((e) => {
    if (!(e instanceof BizError)) {
      uni.showToast({ icon: 'none', title: '网络异常，请重试' });
      return;
    }
    const { level, userMsg } = getBizErrorHint(e.code);
    if (level === 'fatal') {
      uni.showModal({ title: '请注意', content: userMsg, showCancel: false });
    } else {
      uni.showToast({ icon: 'none', title: userMsg });
    }
  });
}
```

### 9.3 zod schema（运行时校验，与后端同源）

（同 v1.0，但所有 schema 放到 `packages/shared-types/` monorepo 包里）

### 9.4 Idempotency-Key

```typescript
// src/utils/uuid.ts
// 用 crypto.randomUUID() (H5 + WX 小程序均支持)；兜底 polyfill 写在 shime-uni.d.ts
```

### 9.5 金额解码（v1.1 关键）

```typescript
// src/types/amount.ts
import Decimal from 'decimal.js';

/** 服务端 BigInt → API 字符串 → 前端 Decimal — 永不直接用 Number 接 */
export function parseCents(s: string | null | undefined): Decimal {
  if (s == null) return new Decimal(0);
  return new Decimal(s);                       // 不除以 100，因为这是金额分基础
}

/** 前端需要展示 ¥xxx.yy 时转字符串 */
export function fmtCents(c: Decimal | string): string {
  return new Decimal(c).div(100).toFixed(2);
}

/** 与 schema 同源：用 zod 把所有 `*Cents` 字段标记为 z.string().regex(/^\d+$/) */
```

**为什么不用 Number**：

```js
const total = 146283 * 10000 * 100;  // 年度累计预估 ≈ 1.46e11
console.log(total);                  // 146283000000  还可以
const total = 146283 * 10000 * 1000; // ≈ 1.46e12
console.log(total);                  // 1462830000000 OK
console.log(total.toFixed(0));       // "1462830000000" OK
// 但当超过 Number.MAX_SAFE_INTEGER (9007199254740991 ≈ 9.007e15) 时
const total = 9007199254740993;
console.log(total);                  // 9007199254740992  已经掉了 1
```

公司级别报表（年度合计 / 区域合计 / 多年趋势）必爆 → 必须用 BigInt 等价方案。

### 9.6 Mock 切换

（v1.0 不变；标 USE_MOCK=true 时全部走 `src/mock/data.ts`）

---

## 10. 类型共享

（同 §3.2 monorepo 化；MVP 阶段手写 zod schema）

---

## 11. 多端构建

（v1.0 不变；detail 见 §16 device mode）

---

## 12. 常见坑 / 注意事项

（v1.0 10 条不变；v1.1 新增）

11. **金额字段用 Number 直接接 → 一定挂**：用 `parseCents()` 工具类
12. **错误码段位判断错（4xxxx 当 HTTP 404）**：`getBizErrorHint()` 拦截
13. **traceparent 不是 16 位 UUID**：`generateTraceparent()` 写死 W3C 格式
14. **Idempotency-Key 漏发**：`onRequest` 拦截器自动注入，不必手写

---

## 13. 迁移自 v2 / v3-next 的注意事项

（同 v1.0）

---

## 14. 验收清单

（同 v1.0 + v1.1 P0 新增）

| 里程碑 | 验收 |
|---|---|
| 金额安全 | `grep -R "Number(" src/api/` 命中为空 / `parseCents()` 全部 |
| 错误码段位 | 单元测试：所有 catch 走 `BizError` |
| Idempotency | 网络重发模拟（同一 key 同 body 命中重放） |
| traceparent | 浏览器 F12 看 Network：每个出站请求都带 traceparent |

---

## 15. 参考资料

（同 v1.0 + `docs/API.md` v1.1）

---

## 16. 多端场景 / Device Mode（v1.1 新增）

三个 device mode 视觉与交互差异：

| 模式 | 终端 | 视口 | 字体 | 网络抖动容忍 | 备注 |
|---|---|---|---|---|---|
| `sales-field` | 微信小程序（外勤手机） | 375 × 812 | 系统默认 | 高（弱网/离线） | 主战场，70% 流量 |
| `office-h5` | 桌面浏览器（H5 演示） | 1280+ | 系统默认 | 低 | 内部演示 / 临时办公 |
| `admin-pc` | 桌面浏览器（Refine 后台） | 1280+ | 系统默认 | 低 | 运营/财务/主管，**不在小程序** |

实现：

```typescript
// src/config/device.ts
export const DEVICE_MODE = uni.getSystemInfoSync().platform === 'devtools' ? 'office-h5'
  : process.env.UNI_PLATFORM === 'mp-weixin' ? 'sales-field'
  : 'office-h5';

// 在 main.ts 启动时：
const mode = process.env.UNI_PLATFORM === 'mp-weixin' ? 'sales-field' : 'office-h5';
import(`./modes/${mode}.ts`).then(m => m.setup());
```

每个 mode 文件里**只挂载该模式需要的**：
- `sales-field.ts`：注册 wx.scanCode、wx.getLocation、wx.chooseLocation、wx.requestPayment
- `office-h5.ts`：注册 dragula、echarts、xlsx 解析

不在场的小程序 API 不打包（Vite tree-shake 解决）。

---

## 17. 状态机前端处理（v1.1 新增）

后端所有状态字段都有枚举，前端按枚举渲染：

```typescript
// src/types/order.ts
export const ORDER_STATUS = ['DRAFT','PENDING_CONFIRM','CONFIRMED','SHIPPED','COMPLETED','CANCELLED'] as const;
export type OrderStatus = typeof ORDER_STATUS[number];

// 字典码 → 中文
export const ORDER_STATUS_CN: Record<OrderStatus, string> = {
  DRAFT: '草稿',
  PENDING_CONFIRM: '待确认',
  CONFIRMED: '已确认',
  SHIPPED: '已发货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

// 当前状态可执行的下一步（用于按钮渲染）
export const ORDER_NEXT_ACTIONS: Record<OrderStatus, Array<{ to: OrderStatus; label: string }>> = {
  DRAFT:            [{ to: 'PENDING_CONFIRM', label: '提交确认' }],
  PENDING_CONFIRM:  [{ to: 'CONFIRMED', label: '标记已确认' }, { to: 'CANCELLED', label: '取消' }],
  CONFIRMED:        [{ to: 'SHIPPED', label: '发货' }],
  SHIPPED:          [{ to: 'COMPLETED', label: '标记完成' }],
  COMPLETED:        [],
  CANCELLED:        [],
};
```

**乐观锁**：所有 PATCH 调用必须带 `If-Match: <version>`：

```typescript
// src/api/orders.ts
export async function updateOrderStatus(id: string, version: number, status: OrderStatus, remark?: string) {
  return api.Patch(`/orders/${id}/status`, { status, remark }, {
    headers: { 'If-Match': String(version) },
  });
}
```

后端返 409 + code 10009 时，前端拦截器自动弹 toast "数据已被他人修改，正在刷新最新版本..."

### 17.1 长连接 vs 轮询

v1.1 阶段用 **轮询**：

```typescript
// modules/orders/follow-order.ts
export function useFollowOrder(orderId: string, initialVersion: number) {
  const version = ref(initialVersion);
  const stop = ref(false);

  async function poll() {
    if (stop.value) return;
    const r = await api.Get(`/orders/${orderId}/brief`);
    if (r.data.version !== version.value) {
      version.value = r.data.version;
      // 触发 store 重新拉详情
    }
    setTimeout(poll, 3000);
  }
  onMounted(poll);
  onUnmounted(() => { stop.value = true; });
  return { version };
}
```

v2.0 计划升 SSE 或 WebSocket。

---

## 18. 微信小程序限制速记

| 项 | 限制 |
|---|---|
| 主包 | < 2 MB（gzip 算） |
| 单包异步分包 | < 4 MB 总包 |
| 请求域名白名单 | 需在 MP 后台配置（详见 `docs/COMPLIANCE.md`） |
| 真机调试 | 微信开发者工具"预览"扫码 |
| 推送 | 用 `wx.requestSubscribeMessage`，需用户主动触发 |
| 屏幕旋转 | uni-app 默认支持横竖屏；详见 `docs/COMPLIANCE.md` |

---

## 19. 维护者签名

发现本文档与代码不符时以代码为准，PR 文档更新。
