# 销卓宝 v3 API 接口契约

> 版本：v1.1（实现对账版）
> 更新：2026-07-22
> 本文以当前 `server/src` 的实际控制器、Zod schema 和公共拦截器为准，供 `v3-uniapp` 与后端联调使用。
> 开发环境基础地址：`http://localhost:4000/api/v1`
> Swagger：`http://localhost:4000/api/v1/docs`

## 变更日志

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-07-22 | v1.1 | 初版实现对账；补充筛选枚举、待办派生规则、库存状态机和联调约定 |
| 2026-07-22 | v1.1.1 | 新增 `PATCH /aftersales/:id/status`；补齐 /biz summary、/me/utilities、follow/todos 派生说明；新增字段级校验约束附录；补齐商品 reservedQty 可售库存说明 |

---

## 1. 快速开始

1. 启动 PostgreSQL，执行 `server` 目录下的 Prisma migration 与 seed。
2. 启动后端：`npm run start:dev`，默认端口 `4000`。
3. v3-uniapp H5 前端默认运行在 `http://localhost:8080`，后端默认 CORS 已允许该来源。
4. 除公开接口外，所有请求都必须带 `Authorization: Bearer <accessToken>`。
5. 所有 `POST`、`PATCH`、`DELETE` 请求都必须带合法 UUID v4 的 `Idempotency-Key`。

公开接口只有：

- `GET /health`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /storage/files/*`（必须带有效签名参数）

---

## 2. 通用约定

### 2.1 请求头

| Header | 必填 | 适用范围 | 说明 |
|---|---:|---|---|
| `Authorization` | 是 | 除公开接口外 | `Bearer <accessToken>` |
| `Content-Type` | 写请求 | JSON 写请求 | `application/json`；文件上传也是 JSON，不是 multipart |
| `traceparent` | 否 | 所有请求 | W3C Trace Context，建议前端每次请求生成 |
| `Idempotency-Key` | 写请求 | `POST/PATCH/DELETE` | UUID v4；服务端保存 24 小时 |
| `If-Match` | 部分 PATCH | 乐观锁端点 | 十进制整数版本号，如 `3` |
| `Accept-Language` | 否 | 所有请求 | 当前建议固定为 `zh-CN` |

服务端从 `traceparent` 提取链路 ID，并在响应头返回 `X-Trace-Id`；服务端不会把 `traceparent` 原样作为响应头返回。

### 2.2 标准响应

除 `204` 外，响应统一为：

```json
{
  "code": 0,
  "data": {},
  "msg": "ok",
  "traceId": "32 位小写十六进制字符串"
}
```

失败响应仍使用同一结构，`data` 固定为 `null`：

```json
{
  "code": 10404,
  "data": null,
  "msg": "资源不存在",
  "traceId": "32 位小写十六进制字符串"
}
```

`code=0` 表示成功；非零 `code` 是业务码，与 HTTP 状态码独立。

### 2.3 HTTP 状态码

| HTTP | 含义 |
|---:|---|
| 200 | 查询、普通写操作成功 |
| 201 | 创建资源成功 |
| 204 | 登出、待办状态变更、订单状态变更成功，无响应体 |
| 400 | 请求参数或必填请求头不合法 |
| 401 | 未登录、Token 无效、登录失败或刷新 Token 失败 |
| 403 | 当前角色无权限 |
| 404 | 资源或路由不存在 |
| 409 | 状态跃迁冲突、版本冲突或重复资源 |
| 413 | 文件解码后超过 10 MB |
| 422 | 业务规则不满足 |
| 503 | 幂等锁等待超时等服务暂不可用 |
| 500 | 未分类服务端错误 |
### 2.4 幂等请求

服务端对 `POST`、`PATCH`、`DELETE` 统一要求 `Idempotency-Key`：

- 必须是 UUID v4；缺失或格式错误返回 `40004`。
- 同一用户、方法、路径和请求体重复提交时，24 小时内返回第一次结果，并增加响应头 `Idempotent-Replay: true`。
- 同一个 key 用于不同请求或不同请求体时返回 HTTP `422`、业务码 `10422`。
- 登录和刷新 Token 虽然是公开接口，也必须带 `Idempotency-Key`。

### 2.5 乐观锁

以下接口必须额外带 `If-Match`：

- `PATCH /customers/:id`
- `PATCH /projects/:id`
- `PATCH /contracts/:id`
- `PATCH /products/:id/stock`
- `PATCH /orders/:id/status`
- `PATCH /biz/:id/status`

版本不匹配返回 HTTP `409`、业务码 `10009`。服务端成功更新后会把 `version` 加一。

### 2.6 分页

普通分页参数：

| 参数 | 类型 | 默认值 | 限制 |
|---|---|---:|---|
| `page` | number | 1 | 大于等于 1 |
| `size` | number | 20 | 1 到 100 |

普通列表返回 `items`、`page`、`size`、`total`、`hasMore`。

订单、售后、待办同时支持 cursor：传 `cursor=<上一页 nextCursor>` 时，服务端从该 ID 之后继续取数；响应始终返回 `nextCursor`，没有下一页时为 `null`。

### 2.7 金额与时间

- `BigInt` 金额字段统一返回整数分字符串，例如 `"14820000"` 表示 148,200.00 元。
- 创建或更新金额字段也必须传整数分字符串，不能传浮点数。
- `DateTime` 响应为 ISO 8601 UTC 字符串。
- 仅日期字段使用 `YYYY-MM-DD`。
- `version`、库存、数量和分页计数是 JSON number；待办汇总计数是字符串。

### 2.8 缓存响应头

| 路径 | 响应头 |
|---|---|
| `/dicts` | `public, max-age=300, s-maxage=600` |
| `/me`、`/ai/modules` | `private, max-age=60` |
| `/me/reports` | `private, no-cache` |
| `/health` | `public, max-age=30` |
| 其他 GET | `private, max-age=60` |

### 2.9 角色

角色枚举：`SALES`、`REGION_MGR`、`FINANCE`、`ADMIN`。

| 能力 | SALES | REGION_MGR | FINANCE | ADMIN |
|---|:---:|:---:|:---:|:---:|
| 读取受保护资源 | 是 | 是 | 是 | 是 |
| 客商新建/编辑 | 是 | 是 | 否 | 是 |
| 项目/合同新建/编辑 | 是 | 是 | 否 | 是 |
| 订单新建/状态变更 | 是（受状态机限制） | 是（受状态机限制） | 否 | 是 |
| 售后新建 | 是 | 是 | 否 | 是 |
| 商品库存调整 | 否 | 是 | 否 | 是 |
| 业务表单新建 | 是 | 是 | 否 | 是 |
| 业务表单状态变更 | 否 | 否 | 否 | 是 |

---

### 2.10 列表筛选值

Zod 的 `enum/nativeEnum` 匹配大小写；普通字符串筛选只去首尾空格后做精确匹配，不会自动转成字典 code。

| 资源 | 参数 | 实际可传值 |
|---|---|---|
| 客商 | `filter_cat` | 字符串，trim 后最长 32；当前 seed 为 `客户`，无固定枚举 |
| 客商 | `filter_status` | 字符串，trim 后最长 32；当前 seed 为 `已生效`，无固定枚举 |
| 项目 | `filter_status` | 字符串，trim；无固定枚举，当前 seed 为 `已生效` |
| 合同 | `filter_status` | 字符串，trim；无固定枚举，当前 seed 为 `已生效` |
| 商品 | `filter_cat` | 字符串，trim；当前 seed 为 `防水材料`，无固定枚举 |
| 订单 | `filter_status` | `DRAFT`、`PENDING_CONFIRM`、`CONFIRMED`、`SHIPPED`、`COMPLETED`、`CANCELLED` |
| 售后 | `filter_status` | `PENDING_OA`、`SAP_CREATED`、`IN_HANDLING`、`CLOSED`、`REJECTED` |
| 待办 | `filter` | `PENDING`、`IN_PROGRESS`、`DONE`、`CANCELLED` |
| 业务表单 | `filter_status` | `DRAFT`、`PENDING`、`APPROVED`、`REJECTED`、`CLOSED` |

客商的 `customer_status` 字典虽然返回 `ACTIVE/PENDING/REJECTED` code，但当前 `Customer.status` 数据保存并按中文 label（如 `已生效`）精确筛选；两者不会由服务端自动转换。

---

## 3. 错误码

| code | HTTP | 含义 |
|---:|---:|---|
| `10002` | 409 | 唯一约束冲突或重复提交 |
| `10008` | 409 | 非法状态跃迁 |
| `10009` | 409 | `If-Match` 版本不匹配 |
| `10404` | 404 | 资源不存在 |
| `10422` | 422 | 业务规则违反、库存不足、关联资源不存在 |
| `20100` | 401 | 未登录或 Token 无效/过期 |
| `20101` | 401 | 用户名或密码错误 |
| `20102` | 401 | 账号已禁用或已锁定 |
| `20103` | 403 | 当前角色无权限 |
| `20104` | 401 | refreshToken 无效、过期或已使用 |
| `20429` | 429 | 请求过于频繁；当前服务端未启用通用限流，阈值未定义 |
| `40000` | 400 | 请求参数校验失败 |
| `40001` | 400 | 文件类型不允许或文件内容为空 |
| `40002` | 413 | 文件超过 10 MB |
| `40004` | 400 | 必填请求头缺失/格式错误或 URL 不合法 |
| `50000` | 500 | 未知服务端错误 |
| `50001` | 500 | 数据库错误 |
| `50301` | 503 | 幂等锁等待超时 |

> 错误消息 `msg` 可能包含具体资源 ID、字段名或校验原因，前端应优先展示 `msg`，同时按 `code` 做登录过期、版本冲突等分支处理。
## 4. 健康检查

### `GET /health`

公开接口，无需 Token。

响应 `200`：

```json
{
  "code": 0,
  "data": {
    "status": "ok",
    "timestamp": "2026-07-22T08:00:00.000Z"
  },
  "msg": "ok",
  "traceId": "..."
}
```

## 5. 鉴权

### `POST /auth/login`

公开接口，但仍需 `Idempotency-Key`。

请求：

```json
{
  "username": "zhangming",
  "password": "Xzb@2026!"
}
```

约束：`username` 去首尾空格后长度 1 到 64；`password` 长度 8 到 128。

成功响应 `200`：

```json
{
  "code": 0,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "tk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "accessTokenExpiresIn": 900,
    "user": {
      "id": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      "username": "zhangming",
      "displayName": "张明",
      "avatarUrl": null,
      "role": "SALES",
      "region": "上海"
    }
  },
  "msg": "ok",
  "traceId": "..."
}
```

登录失败 5 次后账号锁定 15 分钟；错误分别使用 `20101`、`20102`。

### `POST /auth/refresh`

公开接口，但仍需 `Idempotency-Key`。refresh token 每次成功刷新后立即轮换，旧 token 不能再次使用。

请求：

```json
{
  "refreshToken": "tk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

`refreshToken` 必须匹配 `^tk_[A-Za-z0-9_-]{43}$`。

成功响应的数据结构与登录完全相同。无效、过期或重复使用返回 HTTP `401`、业务码 `20104`。

### `GET /auth/me`

需要登录。

成功响应 `data`：

```json
{
  "id": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
  "username": "zhangming",
  "displayName": "张明",
  "avatarUrl": null,
  "role": "SALES",
  "region": "上海",
  "permissions": [
    "customers:read",
    "customers:write",
    "orders:read",
    "orders:write",
    "aftersales:write"
  ]
}
```

### `POST /auth/logout`

需要登录和 `Idempotency-Key`。成功返回 `204`，无响应体；服务端会清除当前用户的 refresh token。

## 6. 客商

客商标识 `:id` 支持数据库 `id` 或业务编号 `bp`。

### `GET /customers`

需要登录。查询参数：

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `page` | number | 1 | 页码 |
| `size` | number | 20 | 每页 1 到 100 |
| `keyword` | string | — | 匹配 BP、编号、名称、联系人 |
| `sort` | enum | `createdAt` | `createdAt`、`updatedAt`、`code`、`name` |
| `order` | enum | `desc` | `asc` 或 `desc` |
| `filter_cat` | string | — | 客商分类 |
| `filter_status` | string | — | 客商状态 |

列表项 `data.items[]`：

```json
{
  "id": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
  "bp": "BP100001",
  "code": "C-2026-001",
  "name": "上海建工建材有限公司",
  "cat": "客户",
  "status": "已生效",
  "contact": "张工 · 15938000123",
  "addr": "上海浦东新区",
  "regionBp": null,
  "version": 1,
  "isDeleted": false
}
```

列表外层还返回 `page`、`size`、`total`、`hasMore`。
### `GET /customers/:id`

需要登录。成功响应 `data` 包含客商基础字段、`stats` 和最近 5 条订单：

```json
{
  "id": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
  "bp": "BP100001",
  "code": "C-2026-001",
  "name": "上海建工建材有限公司",
  "cat": "客户",
  "status": "已生效",
  "contact": "张工 · 15938000123",
  "addr": "上海浦东新区",
  "regionBp": null,
  "isDeleted": false,
  "version": 1,
  "createdAt": "2026-07-01T09:00:00.000Z",
  "updatedAt": "2026-07-15T14:22:11.000Z",
  "deletedAt": null,
  "stats": {
    "orderCount": "5",
    "orderTotalCents": "14820000",
    "aftersaleCount": "1",
    "projectCount": "2"
  },
  "recentOrders": [
    {
      "id": "clorderxxxxxxxxxxxxxxxxxxxx",
      "no": "SO20260716-001",
      "amtCents": "244800",
      "status": "已发货",
      "orderDate": "2026-07-14",
      "version": 1
    }
  ]
}
```

### `POST /customers`

需要角色 `SALES`、`REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key`。

请求体：

```json
{
  "name": "上海建工建材有限公司",
  "cat": "客户",
  "status": "已生效",
  "contact": "张工 · 15938000123",
  "addr": "上海浦东新区",
  "regionBp": "REGION-SH"
}
```

`name`、`cat`、`status`、`contact`、`addr` 必填；`regionBp` 可选。成功返回 `201` 和新客商对象。

### `PATCH /customers/:id`

需要角色 `SALES`、`REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key` 与 `If-Match`。

请求体是新建字段的部分更新，至少传一个字段：

```json
{
  "contact": "李工 · 13800000000",
  "addr": "上海徐汇区"
}
```

成功返回 `200` 和更新后的客商列表对象；版本冲突返回 `10009`。

当前没有客商删除接口。

## 7. 项目

项目标识 `:id` 支持 `id` 或项目编号 `no`。

### `GET /projects`

查询参数：`page`、`size`、`customerId`、`filter_status`、`keyword`。`keyword` 匹配项目编号或名称。

`data.items[]` 字段：

```json
{
  "id": "clprojectxxxxxxxxxxxxxxxxxxx",
  "no": "PRJ-2026-001",
  "name": "浦东新区防水改造工程",
  "customerId": "clcustomerxxxxxxxxxxxxxxxx",
  "customerName": "上海建工建材有限公司",
  "status": "进行中",
  "amtCents": "58000000",
  "version": 1,
  "isDeleted": false,
  "createdAt": "2026-07-01T09:00:00.000Z",
  "updatedAt": "2026-07-15T14:22:11.000Z"
}
```

### `GET /projects/:id`

需要登录，返回单个项目对象。

### `POST /projects`

需要角色 `SALES`、`REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key`。

```json
{
  "no": "PRJ-2026-001",
  "name": "浦东新区防水改造工程",
  "customerId": "clcustomerxxxxxxxxxxxxxxxx",
  "status": "进行中",
  "amtCents": "58000000"
}
```

`no` 可省略，服务端会自动生成；其余字段必填。

### `PATCH /projects/:id`

需要角色 `SALES`、`REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key`、`If-Match`。可更新 `name`、`customerId`、`status`、`amtCents`，至少传一个字段；`no` 不可更新。
## 8. 合同

合同标识 `:id` 支持 `id` 或合同编号 `no`。

### `GET /contracts`

查询参数：`page`、`size`、`customerId`、`projectId`、`filter_status`、`keyword`。`keyword` 匹配合同编号或名称。

`data.items[]` 字段：

```json
{
  "id": "clcontractxxxxxxxxxxxxxxxxx",
  "no": "HT-2026-001",
  "name": "浦东新区采购合同",
  "customerId": "clcustomerxxxxxxxxxxxxxxxx",
  "customerName": "上海建工建材有限公司",
  "projectId": "clprojectxxxxxxxxxxxxxxxxxxx",
  "projectName": "浦东新区防水改造工程",
  "signedBy": "张明",
  "status": "生效",
  "amtCents": "58000000",
  "fileUrl": null,
  "version": 1,
  "isDeleted": false,
  "createdAt": "2026-07-01T09:00:00.000Z",
  "updatedAt": "2026-07-15T14:22:11.000Z"
}
```

### `GET /contracts/:id`

需要登录，返回单个合同对象。

### `POST /contracts`

需要角色 `SALES`、`REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key`。

```json
{
  "no": "HT-2026-001",
  "name": "浦东新区采购合同",
  "customerId": "clcustomerxxxxxxxxxxxxxxxx",
  "projectId": "clprojectxxxxxxxxxxxxxxxxxxx",
  "signedBy": "张明",
  "status": "生效",
  "amtCents": "58000000",
  "fileUrl": "/api/v1/storage/files/uploads/contract.pdf"
}
```

`no`、`projectId`、`signedBy`、`fileUrl` 可选；`name`、`customerId`、`status`、`amtCents` 必填。

### `PATCH /contracts/:id`

需要角色 `SALES`、`REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key`、`If-Match`。可部分更新除 `no` 外的字段，至少传一个字段。

## 9. 商品

商品标识 `:id` 支持 `id` 或商品编号 `no`。

### `GET /products`

查询参数：`page`、`size`、`keyword`、`filter_cat`、`active`。`keyword` 匹配编号、名称或规格；`active` 是布尔值。

`data.items[]` 字段：

```json
{
  "id": "clproductxxxxxxxxxxxxxxxxxx",
  "no": "3001-005-01",
  "name": "K11 通用型防水涂料",
  "spec": "20kg/桶",
  "cat": "防水材料",
  "stock": 320,
  "reservedQty": 10,
  "priceCents": "24480",
  "unit": "桶",
  "isActive": true,
  "isDeleted": false,
  "version": 1,
  "updatedAt": "2026-07-15T14:22:11.000Z"
}
```

列表外层返回 `page`、`size`、`total`、`hasMore`。

`stock` 是物理库存总量，`reservedQty` 是已被草稿、待确认或已确认订单预占但尚未发货的数量；前端展示可售库存时使用 `availableQty = stock - reservedQty`。

### `GET /products/:id`

需要登录，返回单个商品对象。

### `PATCH /products/:id/stock`

需要角色 `REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key`、`If-Match`。

```json
{
  "stockDelta": 50,
  "remark": "调拨入库"
}
```

`stockDelta` 是非零整数，范围 `-1000000` 到 `1000000`；`remark` 必填。库存调整成功返回 `200` 和最新商品对象；库存不能为负返回 `10422`。
## 10. 订单

订单标识 `:id` 支持 `id` 或订单号 `no`。

### `GET /orders`

需要登录。查询参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `page` | number | 页码，默认 1 |
| `size` | number | 每页 1 到 100，默认 20 |
| `cursor` | string | 上一页 `nextCursor` |
| `customerId` | string | 客商 ID |
| `filter_status` | enum | `DRAFT`、`PENDING_CONFIRM`、`CONFIRMED`、`SHIPPED`、`COMPLETED`、`CANCELLED` |
| `keyword` | string | 匹配订单号或客商名称，最多 100 字符 |
| `dateFrom` | `YYYY-MM-DD` | 订单日期起始 |
| `dateTo` | `YYYY-MM-DD` | 订单日期结束 |

列表项 `data.items[]`：

```json
{
  "id": "clorderxxxxxxxxxxxxxxxxxxxx",
  "no": "SO20260716-001",
  "customerId": "clcustomerxxxxxxxxxxxxxxxx",
  "customerName": "上海建工建材有限公司",
  "amtCents": "244800",
  "status": "已发货",
  "statusCode": "SHIPPED",
  "qty": "1 行 · 10 件",
  "orderDate": "2026-07-14",
  "expectedShipDate": "2026-07-18",
  "version": 2
}
```

列表外层返回 `page`、`size`、`total`、`hasMore`、`nextCursor`。

### `GET /orders/:id`

需要登录。详情在列表字段基础上增加：

```json
{
  "address": "上海浦东新区 xx 路 xx 号",
  "createdById": "cluserxxxxxxxxxxxxxxxxxxxxx",
  "createdAt": "2026-07-14T09:00:00.000Z",
  "updatedAt": "2026-07-15T14:22:11.000Z",
  "items": [
    {
      "id": "clitemxxxxxxxxxxxxxxxxxxxxxx",
      "productId": "clproductxxxxxxxxxxxxxxxxxx",
      "qty": 10,
      "productNo": "3001-005-01",
      "productName": "K11 通用型防水涂料",
      "spec": "20kg/桶",
      "unit": "桶",
      "priceCents": "24480"
    }
  ],
  "logs": [
    {
      "id": "cllogxxxxxxxxxxxxxxxxxxxxxxx",
      "action": "创建订单",
      "actor": "张明",
      "at": "2026-07-14T09:00:00.000Z",
      "remark": null
    }
  ]
}
```

### `POST /orders`

需要角色 `SALES`、`REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key`。

```json
{
  "customerId": "clcustomerxxxxxxxxxxxxxxxx",
  "address": "上海浦东新区 xx 路 xx 号",
  "expectedShipDate": "2026-07-18",
  "items": [
    { "productId": "clproductxxxxxxxxxxxxxxxxxx", "qty": 10 }
  ]
}
```

`expectedShipDate` 可选；`items` 至少 1 项、最多 100 项，同一商品不能重复。创建时服务端会校验客商、商品状态和可用库存，并原子预占库存。成功返回 `201` 和订单详情。

### `PATCH /orders/:id/status`

需要角色并受状态机限制，带 `Idempotency-Key`、`If-Match`：

```json
{
  "status": "CONFIRMED",
  "remark": "客户已确认"
}
```

成功返回 `204`。合法状态跃迁：

| 当前状态 | 可变更为 | 限制 |
|---|---|---|
| `DRAFT` | `PENDING_CONFIRM` | 创建者；`REGION_MGR/ADMIN` 可取消 |
| `PENDING_CONFIRM` | `CONFIRMED`、`CANCELLED` | 创建者；管理员和区域经理可处理 |
| `CONFIRMED` | `SHIPPED` | 仅 `ADMIN` |
| `SHIPPED` | `COMPLETED` | 创建者；`REGION_MGR/ADMIN` 可处理 |
| 非取消状态 | `CANCELLED` | `REGION_MGR` 或 `ADMIN` |

非法跃迁返回 `10008`；状态变更时库存会按状态回滚或扣减。

库存动作：创建订单为 `DRAFT` 并原子增加 `reservedQty`；`DRAFT -> PENDING_CONFIRM -> CONFIRMED` 期间保持预占；`CONFIRMED -> SHIPPED` 时同时扣减 `stock` 和 `reservedQty`；发货前取消只减少 `reservedQty`；发货后取消（含已完成订单）恢复 `stock`。`SHIPPED -> COMPLETED` 不再改变库存。
## 11. 售后

售后标识 `:id` 支持 `id` 或售后单号 `no`。

### `GET /aftersales`

查询参数：`page`、`size`、`cursor`、`filter_status`。

`filter_status` 可取：`PENDING_OA`、`SAP_CREATED`、`IN_HANDLING`、`CLOSED`、`REJECTED`。

列表项字段：

```json
{
  "id": "claftersalexxxxxxxxxxxxxxxxx",
  "no": "AF20260716-001",
  "orderId": "clorderxxxxxxxxxxxxxxxxxxxx",
  "orderNo": "SO20260716-001",
  "customerId": "clcustomerxxxxxxxxxxxxxxxx",
  "customerName": "上海建工建材有限公司",
  "material": "K11 防水涂料 10 桶",
  "reason": "质量问题",
  "reasonCode": "QUALITY",
  "status": "待 OA 审批",
  "statusCode": "PENDING_OA",
  "occurredAt": "2026-07-16T09:41:23.000Z",
  "images": [],
  "oaFlowId": null,
  "version": 1,
  "isDeleted": false,
  "createdAt": "2026-07-16T09:41:23.000Z",
  "updatedAt": "2026-07-16T09:41:23.000Z"
}
```

列表外层返回 `page`、`size`、`total`、`hasMore`、`nextCursor`。

### `GET /aftersales/:id`

需要登录，返回单个售后对象。

### `POST /aftersales`

需要角色 `SALES`、`REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key`。

```json
{
  "orderId": "clorderxxxxxxxxxxxxxxxxxxxx",
  "material": "K11 防水涂料 10 桶",
  "reason": "QUALITY",
  "occurredAt": "2026-07-16T09:41:23.000Z",
  "images": ["/api/v1/storage/files/uploads/2026/07/21/u/a.png"]
}
```

`reason` 可取 `QUALITY`、`WRONG_GOODS`、`DAMAGED`、`OTHER`；`images` 最多 20 项，默认空数组。新建后状态固定为 `PENDING_OA`，成功返回 `201`。

### `PATCH /aftersales/:id/status`

需要角色 `SALES`、`REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key`、`If-Match`。
```json
{
  "status": "IN_HANDLING",
  "remark": "已联系客户补充材料"
}
```

状态机：

| 当前状态 | 可变更为 | 限制 |
|---|---|---|
| `PENDING_OA` | `IN_HANDLING`、`REJECTED` | 创建人/区域经理/管理员 |
| `SAP_CREATED` | `IN_HANDLING`、`CLOSED` | 由 SAP 集成写入（当前由 ADMIN 手动推进） |
| `IN_HANDLING` | `CLOSED`、`REJECTED` | 任意写入角色 |
| `CLOSED`、`REJECTED` | 终态，不可继续 | - |

成功返回 `200` 和更新后的售后对象；版本不匹配返回 `10009`；非法跃迁返回 `10008`。
"补充材料" 未单独建模，沿用 `PATCH /aftersales/:id/status` 携带 `remark` 写入日志。

## 12. 跟进与待办

### `GET /follow/todos`

返回当前登录用户的待办。查询参数：`filter`、`page`、`size`、`cursor`。

`filter` 可取 `PENDING`、`IN_PROGRESS`、`DONE`、`CANCELLED`。

响应 `data`：

```json
{
  "items": [
    {
      "id": "cltodo01j3s8w4k7m2n9p6q5r4t3y2",
      "kind": "APPROVAL",
      "title": "客户申请审批",
      "subtitle": "申请人：张明",
      "node": "销售负责人审批",
      "dueAt": "2026-07-17T18:00:00.000Z",
      "status": "PENDING",
      "version": 1
    }
  ],
  "summary": {
    "total": "3",
    "pending": "2",
    "inProgress": "1",
    "done": "0"
  },
  "page": 1,
  "size": 20,
  "hasMore": false,
  "nextCursor": null
}
```

`summary` 不受当前分页窗口影响，四个计数字段都是字符串。

当前没有 `POST /follow/todos` 新建接口。待办由订单确认、审批等业务动作在服务端自动派生；客户端只能查询、完成或取消已有待办，不能直接创建。

### `POST /follow/todos/:id/done`

需要登录和 `Idempotency-Key`，请求体可传 `{}` 或：

```json
{ "remark": "已处理" }
```

成功返回 `204`。

### `POST /follow/todos/:id/cancel`

需要登录和 `Idempotency-Key`，请求体必须包含：

```json
{ "reason": "客户撤回" }
```

成功返回 `204`。已完成或已取消的待办再次操作返回 `10404`。
## 13. 业务表单

### 13.1 列表与详情

### `GET /biz`

查询参数：`kind`、`filter_status`、`page`、`size`。`kind` 可取：

`MEETING`、`STOCKING`、`SHIPMENT`、`ADVERT`、`STORE`、`SUBSIDY`、`RENTAL`、`COMPLAINT`。

ilter_status 可取 DRAFT、PENDING、APPROVED、REJECTED、CLOSED；服务端按状态精确筛选。

响应 `data.items[]` 是业务表单记录：

```json
{
  "id": "clbizxxxxxxxxxxxxxxxxxxxxxx",
  "kind": "MEETING",
  "payload": {
    "customerId": "clcustomerxxxxxxxxxxxxxxxx",
    "topic": "客户拜访",
    "date": "2026-07-22",
    "remark": ""
  },
  "status": "DRAFT",
  "customerId": "clcustomerxxxxxxxxxxxxxxxx",
  "oaFlowId": null,
  "createdById": "cluserxxxxxxxxxxxxxxxxxxxxx",
  "isDeleted": false,
  "deletedAt": null,
  "version": 1,
  "createdAt": "2026-07-22T08:00:00.000Z",
  "updatedAt": "2026-07-22T08:00:00.000Z"
}
```

列表外层返回 `page`、`size`、`total`、`hasMore`。

### `GET /biz/summary`

需要登录。可选查询参数 `kind`，取值与业务表单列表一致；未传时返回全部业务类型的聚合结果。

```json
{
  "items": [
    { "kind": "SHIPMENT", "total": 3, "byStatus": { "DRAFT": 2, "PENDING": 1 } }
  ],
  "statusTotals": { "DRAFT": 2, "PENDING": 1 },
  "generatedBy": "cluserxxxxxxxxxxxxxxxxxxxx",
  "at": "2026-07-22T08:00:00.000Z"
}
```

`total` 和 `byStatus` 的值均为 number；没有记录的业务类型不会出现在 `items` 中，前端按 `0` 补齐。
### `GET /biz/:id`

需要登录，返回单个业务表单记录。

### 13.2 新建

### `POST /biz/:kind`

需要角色 `SALES`、`REGION_MGR` 或 `ADMIN`，并带 `Idempotency-Key`。成功返回 `201`。

所有未知字段会透传保存；下表中的字段是当前服务端强校验字段。

| kind | 必填字段 | 可选字段 |
|---|---|---|
| `MEETING` | `topic` | `customerId`、`date`、`location`、`attendees`、`agenda`、`budgetCents`、`remark` |
| `STOCKING` | `items`、`totalQty` | `customerId`、`expectedDate`、`remark` |
| `SHIPMENT` | `items`、`address`、`plannedDate` | `customerId`、`carrier`、`trackingNo`、`remark` |
| `ADVERT` | `channel`、`periodStart`、`periodEnd`、`budgetCents` | `customerId`、`material`、`remark` |
| `STORE` | `storeName`、`address` | `customerId`、`area`、`storeType`、`remark` |
| `SUBSIDY` | `subsidyType`、`amountCents`、`periodStart` | `customerId`、`periodEnd`、`document`、`remark` |
| `RENTAL` | `itemName`、`startDate`、`endDate`、`dailyRateCents` | `customerId`、`depositCents`、`remark` |
| `COMPLAINT` | `category`、`description`、`occurredAt` | `customerId`、`severity`、`remark` |

金额字段 `budgetCents`、`amountCents`、`dailyRateCents`、`depositCents` 必须是最多 24 位的非负整数分字符串；日期字段为 `YYYY-MM-DD`；`occurredAt` 必须是完整 ISO DateTime。

商品明细 `items` 结构：

```json
[
  { "productId": "clproductxxxxxxxxxxxxxxxxxx", "qty": 10 }
]
```

`severity` 可取 `LOW`、`MEDIUM`、`HIGH`。日期范围字段不能出现结束日期早于开始日期。

### 13.3 状态变更

### `PATCH /biz/:id/status`

仅 `ADMIN` 可调用，带 `Idempotency-Key`、`If-Match`：

```json
{ "status": "PENDING" }
```

状态跃迁：

- `DRAFT -> PENDING` 或 `REJECTED`
- `PENDING -> APPROVED` 或 `REJECTED`
- `APPROVED -> CLOSED` 或 `REJECTED`
- `REJECTED`、`CLOSED` 不可继续跃迁

成功返回 `200` 和更新后的记录；非法跃迁返回 `10008`。
## 14. AI

所有 AI 接口需要登录。当前 AI 是稳定 mock 实现，调用结果会保存在当前进程内，服务重启后历史清空。

### `GET /ai/modules`

返回模块数组：

```json
[
  { "id": "insight", "num": "01", "name": "客户洞察", "desc": "买卖历史 + 预测", "color": "#E8542C" },
  { "id": "quote", "num": "02", "name": "智能报价", "desc": "SAP 价 + 毛利率预测", "color": "#2E5A88" },
  { "id": "risk", "num": "03", "name": "订单预警", "desc": "发货 + 库存 + 质量警示", "color": "#2E7D5B" },
  { "id": "after", "num": "04", "name": "售后分析", "desc": "原因归类 + 责任建议", "color": "#B07F1F" },
  { "id": "kb", "num": "05", "name": "知识助手", "desc": "产品 + 技术 + 施工文档", "color": "#5B6470" },
  { "id": "follow", "num": "06", "name": "跟进助手", "desc": "客户跟进 + 备忘", "color": "#8A95A3" }
]
```

### `POST /ai/:module/invoke`

`:module` 可取 `insight`、`quote`、`risk`、`after`、`kb`、`follow`。请求体：

```json
{
  "prompt": "分析这个客户的回款风险",
  "context": {
    "customerId": "clcustomerxxxxxxxxxxxxxxxx"
  }
}
```

`prompt` 必填，长度 1 到 8000；`context` 可选，为 JSON 对象。成功返回：

```json
{
  "id": "claixxxxxxxxxxxxxxxxxxxxxxxx",
  "module": "risk",
  "prompt": "分析这个客户的回款风险",
  "answer": "AI 服务尚未接入，当前请求已记录。",
  "tokens": "0",
  "createdAt": "2026-07-22T08:00:00.000Z"
}
```

### `GET /ai/:module/history`

返回当前用户、指定模块的历史调用数组，字段与调用结果相同。

## 15. 我的

### `GET /me`

需要登录，返回当前用户对象，结构与 `GET /auth/me` 相同。

### `GET /me/reports?period=MONTH`

需要登录，`period` 可取 `WEEK`、`MONTH`、`QUARTER`、`YEAR`，默认 `MONTH`。

成功响应 `data`：

```json
{
  "period": "MONTH",
  "gmvCents": "14820000",
  "orderCount": "5",
  "aftersaleCount": "1",
  "completion": 0,
  "byWeek": [
    { "week": "2026-W30", "gmvCents": "5800000" }
  ]
}
```

其中 `gmvCents`、`orderCount`、`aftersaleCount` 和 `byWeek[].gmvCents` 是字符串；`completion` 当前固定为 number `0`。

### `GET /me/utilities`

需要登录，返回工具入口数组：

```json
[
  { "id": "profile", "name": "个人资料", "desc": "姓名 / 职务 / 手机", "color": "#0E1419" },
  { "id": "approval", "name": "我的审批", "desc": "待审批 · 已审批 · 我发起", "color": "#E8542C" },
  { "id": "reports", "name": "个人业绩", "desc": "订单 / 销售额 / 售后", "color": "#2E5A88" }
]
```

当前服务端只返回以上 3 个工具项；“我的工作 4 项、系统 3 项、管理 2 项”的其余入口不是本接口契约，前端不要等待服务端返回，后续扩展会通过变更日志补充。

## 16. 字典

### `GET /dicts?kind=customer_status`

需要登录。`kind` 必填，长度 1 到 64。响应：

```json
{
  "kind": "customer_status",
  "items": [
    { "code": "ACTIVE", "label": "已生效" }
  ]
}
```

字典响应缓存 5 分钟，服务端只返回 `isActive=true` 的项目。
## 17. 文件存储

当前默认 driver 是 `local`，文件落在后端 `STORAGE_LOCAL_DIR`；COS/S3 仅保留配置边界。

允许的 MIME 类型：`image/jpeg`、`image/png`、`image/webp`、`image/gif`、`application/pdf`。

### `POST /storage/upload`

需要登录和 `Idempotency-Key`，请求体是 JSON：

```json
{
  "name": "现场照片.png",
  "mimeType": "image/png",
  "base64": "iVBORw0KGgoAAAANSUhEUg..."
}
```

服务端先 Base64 解码，再限制解码后的文件大小不超过 10 MB。成功返回 `201`：

```json
{
  "id": "clfilexxxxxxxxxxxxxxxxxxxxxx",
  "objectKey": "uploads/2026/07/22/user-id/abc123-现场照片.png",
  "url": "/api/v1/storage/files/uploads/2026/07/22/user-id/abc123-现场照片.png",
  "mimeType": "image/png",
  "sizeBytes": 24576,
  "originalName": "现场照片.png",
  "expiresAt": null
}
```

MIME 不允许或内容为空返回 `40001`；超过 10 MB 返回 HTTP `413`、`40002`。

### `POST /storage/sign-url`

需要登录和 `Idempotency-Key`。用于把本服务返回的 `url` 转成临时下载地址：

```json
{
  "url": "/api/v1/storage/files/uploads/2026/07/22/user-id/abc123-现场照片.png",
  "expiresIn": 600
}
```

`expiresIn` 可选，默认 600 秒，最大 86400 秒；`url` 必须以 `STORAGE_PUBLIC_BASE_URL` 开头。成功返回：

```json
{
  "signedUrl": "/api/v1/storage/files/uploads/2026/07/22/user-id/abc123-现场照片.png?exp=1780000000&sig=abcdef123456",
  "expiresAt": "2026-07-22T08:10:00.000Z"
}
```

签名 URL 只需要直接访问，不再需要 Authorization。

### `GET /storage/files/*?exp=<unixSeconds>&sig=<signature>`

公开下载接口，但必须带有效且未过期的 `exp`、`sig`。成功时返回二进制文件，并设置真实 `Content-Type`、`Content-Length`，不是标准 JSON 响应。签名无效返回 `10422`，文件不存在返回 `10404`。

---

## 18. 前端请求层约定

前端 API 客户端建议统一实现以下逻辑：

```ts
// 伪代码，字段名以本文为准
beforeRequest((request) => {
  request.headers.Authorization = `Bearer ${accessToken}`;
  request.headers['Accept-Language'] = 'zh-CN';
  request.headers.traceparent = createW3cTraceparent();
  if (['POST', 'PATCH', 'DELETE'].includes(request.method)) {
    request.headers['Idempotency-Key'] = crypto.randomUUID();
  }
});

onSuccess((body) => {
  if (body.code !== 0) throw new BizError(body.code, body.msg, body.traceId);
  return body.data;
});
```

实际实现还需要：

- 登录成功后保存 `accessToken` 和 `refreshToken`。
- 收到 `20100` 时尝试单次 `POST /auth/refresh`；刷新失败再跳转登录页。
- 收到 `10009` 时提示刷新数据，不要自动覆盖用户当前编辑内容。
- 写请求重试时必须复用原来的 `Idempotency-Key`；新业务操作才生成新 key。
- 金额字段保持字符串，展示时使用 `decimal.js` 转换。
- 列表组件用 `hasMore`、`nextCursor` 判断继续加载，不要用 `items.length` 猜测。

错误重试：仅对 HTTP `503` / `50301` 做有限次指数退避；HTTP `429` / `20429` 只有服务端明确返回时才按 `Retry-After` 等待。`40000`、`40004`、`401`、`403`、`404`、`409`、`422` 不应盲目重试；`10009` 应刷新后让用户重新提交，写请求重试必须复用原 `Idempotency-Key`。

时区：服务端所有 DateTime 使用 UTC；客户端负责按用户设备时区转换后展示，日期型 `YYYY-MM-DD` 不做时区偏移。

当前没有 WebSocket、SSE 或推送路由；AI 为同步一问一答，不提供流式响应。`Accept-Language` 当前仅记录约定，服务端返回的名称、状态、原因等 label 仍来自硬编码或 `/dicts`，前端应优先使用 `statusCode`、`reasonCode` 等机器值做逻辑判断。

---

## 19. 路由清单

完整 API 地址为 `http://localhost:4000/api/v1`；v3-uniapp H5 开发地址为 `http://localhost:8080`。

| 方法 | 路径 | 鉴权 | 成功状态 |
|---|---|---|---:|
| GET | `/health` | 公开 | 200 |
| POST | `/auth/login` | 公开 + 幂等 | 200 |
| POST | `/auth/refresh` | 公开 + 幂等 | 200 |
| GET | `/auth/me` | 登录 | 200 |
| POST | `/auth/logout` | 登录 + 幂等 | 204 |
| GET/POST/PATCH | `/customers`、`/customers/:id` | 登录；写操作按角色 | 200/201 |
| GET/POST/PATCH | `/projects`、`/projects/:id` | 登录；写操作按角色 | 200/201 |
| GET/POST/PATCH | `/contracts`、`/contracts/:id` | 登录；写操作按角色 | 200/201 |
| GET/PATCH | `/products`、`/products/:id/stock` | 登录；库存写操作按角色 | 200 |
| GET/POST/PATCH | `/orders`、`/orders/:id/status` | 登录；写操作按角色 | 200/201/204 |
| GET/POST/PATCH | `/aftersales`、`/aftersales/:id`、`/aftersales/:id/status` | 登录；新建/状态按角色 | 200/201 |
| GET | `/follow/todos` | 登录；待办由服务端派生，不支持新建 | 200 |
| POST | `/follow/todos/:id/{done,cancel}` | 登录 + 幂等 | 204 |
| GET/POST/PATCH | `/biz`、`/biz/summary`、`/biz/:id`、`/biz/:id/status` | 登录；新建/状态按角色 | 200/201 |
| GET/POST | `/ai/modules`、`/ai/:module/{invoke,history}` | 登录 | 200 |
| GET | `/me`、`/me/reports`、`/me/utilities` | 登录 | 200 |
| GET | `/dicts` | 登录 | 200 |
| POST/GET | `/storage/upload`、`/storage/sign-url`、`/storage/files/*` | 上传/签名登录，下载签名公开 | 200/201/二进制 |

## 21. 字段级校验约束

本附录归纳了各接口入口参数的字段级限制，与商业习惯不一致的部分在各项中明说。

### 21.1 全局限制

| 字段 | 限制 | 出处 | 备注 |
|---|---|---|---|
| `username` | trim 后 1–64 位 | `POST /auth/login` | 大小写敏感 |
| `password` | 8–128 位 | `POST /auth/login` | 最少 1 位非字母字符由后端验证 |
| `refreshToken` | `以 tk_ 开头、总长 32–128` | `POST /auth/refresh` | 失效返回 `20104` |
| `Idempotency-Key` | UUID v4 格式 | 所有写接口 | 重复 24h 内返回原调用结果 |
| `If-Match` | 非负整数字符串 | 带乐观锁的 PATCH | 缺失返回 `40004`；不匹配返回 `10009` |
| `amtCents` 等金额字段 | `正则 ^\d{1,24}$`，非负整数分字符串 | 业务表单 / 订单 | 不接受小数 / 负数 |
| `stockDelta` | -1,000,000 至 1,000,000 的非零整数 | `PATCH /products/:id/stock` | 前端传原始数 |
| `periodStart` 等日期字段 | `YYYY-MM-DD`，不做时区偏移 | 订单 / 业务表单 | 结束日期不能早于开始日期 |
| `occurredAt` | ISO 8601 DateTime（带偏移） | 售后 / COMPLAINT | 后端转 UTC 存储 |
| `keyword` | trim 后最多 100 位 | 各列表 | 全匹配编号或名称，大小写敏感，不支持拼音 / 模糊 |
| 枚举值（`OrderStatus` 等） | 大小写敏感 | 各过滤器 | 不会自动转换 |

### 21.2 语义限制

- 当前业务中只用 `contact`（中文名称 + 空格 + 手机号的自由文本），后端不做手机正则验证；联调业务需要时由后端严格验证。
- `code` / `no` / `customerId` 等 ID 参数为 trim 后非空字笾，不会自动补齐前缀或转换大小写。
- 金额字段不接受小数点、负号、空串。
- 状态机跳转只检查 `status` 与现状态的连接表，不检查业务参数。
- 项目编号 `no` 不可修改。

### 21.3 语言与时区

- 服务端不转时区：所有 DateTime 存储为 UTC，`YYYY-MM-DD` 不做时区偏移。
- 客户端负责按用户设备时区转换后展示，现阶段 `Accept-Language: zh-CN` 为唯一被认可的语言。
- 业务文本字段（如 `status` / `reason` / `cat`）以后端硬编码中文 label 返回；`statusCode` / `reasonCode` 为机器友好。

---
## 20. 与当前实现的边界

- SAP、OA、COS、S3 尚未接入真实上游；相关字段目前是本地占位或 mock。
- AI 调用和历史是进程内 mock，重启后清空。
- 当前没有通用删除接口；数据库软删除字段不会通过本 API 直接修改。
- 业务表单允许透传未知 payload 字段，前端新增字段时仍应同步更新本文。
- 本文与代码不一致时，先修正文档和 schema，再进行前端联调；不要在前端静默兼容两套字段。
- SAP/OA/COS/S3 当前没有可调用的集成接口契约；oaFlowId、SAP 相关描述和文件 driver 仅是字段/配置边界，接入时需新增章节并注明回调、鉴权和状态映射。
- 版本演进：兼容性新增字段沿用 `/api/v1`；破坏性变更使用 `/api/v2`，不通过自定义 Header 偷换版本。
- 文档变更必须在顶部变更日志记录日期、版本、影响接口和迁移方式；前端以版本号和路由前缀判断契约。
