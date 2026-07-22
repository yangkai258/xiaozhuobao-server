# 后台管理 · 销卓宝 v1.1

> 版本：v1.1 · 2026-07-21
> 受众：后台开发、运维、产品
> 范围：Refine + React + Ant Design 5 后台架构、模块清单、报表、导出、批量操作、权限矩阵
> 对应：`docs/BACKEND.md` 所有模块 · `docs/INTEGRATION.md` 字段映射

---

## 0. v1.1 变更摘要

| 区域 | v1.0 | v1.1 |
|---|---|---|
| 后台架构 | "Refine 做后台" 一句话 | **独立仓库 + 模块清单 + 权限矩阵** |
| 模块清单 | 无 | **10 实体 CRUD + 8 业务表单 + 字典** 完整列表 |
| 报表 | 无 | 销售业绩 / 客户分析 / 库存周转 三套 |
| 导出 | 无 | Excel / PDF 异步导出 + 飞书通知 |
| 批量操作 | 无 | 导入 Excel / 批量审核 / 批量分配 |
| 权限 | 无 | Admin / FINANCE / REGION_MGR / SALES 矩阵 |

---

## 1. 技术栈

| 维度 | 选型 | 理由 |
|---|---|---|
| 框架 | **Refine 4 + React 18 + TypeScript strict** | Refine 内置 CRUD hooks + 权限框架 |
| UI | **Ant Design 5** | 桌面端组件最完整，中后台首选 |
| 构建 | Vite 5 | 快 |
| 路由 | React Router 6 | Refine 默认 |
| 数据 | Refine `dataProvider` + axios | 支持 restful + graphql |
| 表单 | Refine `useForm` + Ant Design Form | 内置校验 |
| 表格 | Ant Design Table + Refine `useTable` | 内置排序/筛选/分页 |
| 状态 | React Query（Refine 内置） | 缓存/失效 |
| 图表 | Ant Design Charts（G2Plot） | 一致性 |
| 导出 | SheetJS（xlsx）+ jsPDF | 客户端 / 服务端混用 |

---

## 2. 项目结构

```
refine-admin/
├── src/
│   ├── auth/                    # 鉴权（OAuth2 / JWT）
│   ├── core/                    # 通用 providers
│   │   ├── dataProvider.ts      # axios + 错误拦截
│   │   ├── authProvider.ts      # 权限 hook
│   │   └── accessProvider.ts    # 字段级权限
│   ├── pages/
│   │   ├── dashboard/           # 仪表盘
│   │   ├── entities/            # 10 实体 CRUD
│   │   │   ├── customers/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── aftersales/
│   │   │   ├── users/
│   │   │   ├── regions/
│   │   │   ├── orgs/
│   │   │   ├── biz-submissions/
│   │   │   ├── follow-tasks/
│   │   │   └── audit-logs/
│   │   ├── biz-forms/           # 8 业务表单
│   │   │   ├── inquiry/
│   │   │   ├── quotation/
│   │   │   ├── contract/
│   │   │   ├── delivery/
│   │   │   ├── receipt/
│   │   │   ├── visit/
│   │   │   ├── ai-knowledge/
│   │   │   └── sap-mapping/
│   │   ├── reports/             # 报表
│   │   ├── settings/            # 字典、权限
│   │   └── login/
│   ├── components/              # 通用组件
│   ├── hooks/
│   ├── utils/
│   └── App.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. 10 实体 CRUD 清单

### 3.1 通用约定

每个实体页面：
- 列表：表格 + 搜索 + 筛选 + 批量操作
- 详情：Tabs（基本信息 / 关联 / 操作日志）
- 编辑：表单 + 字段级权限 + 乐观锁
- 删除：软删除（标记 `isDeleted`）+ 二次确认

### 3.2 实体清单

| # | 实体 | 列表字段 | 操作 |
|---|---|---|---|
| 1 | **Customer** (客户) | bp / name / region / channel / creditCents / salesOwner | 查看 / 编辑 / 分配销售员 / 导出 |
| 2 | **Product** (物料) | sku / name / unit / priceCents / stockQty / category | 查看 / 编辑 / 调价 / 停用 |
| 3 | **Order** (订单) | no / customer / amount / status / createdBy / createdAt | 查看 / 改状态 / 推送 SAP / 导出 |
| 4 | **Aftersale** (售后) | no / order / customer / type / status / owner | 查看 / 审批 / 退款 / 关闭 |
| 5 | **User** (用户) | name / role / region / org / status | 查看 / 改角色 / 禁用 / 重置密码 |
| 6 | **Region** (区域) | code / name / mgrUserId / gmvTarget | 查看 / 编辑 / 调目标 |
| 7 | **Org** (组织) | code / name / parent / mgrUserId | 查看 / 编辑 / 调层级 |
| 8 | **BizSubmission** (业务审批) | no / type / applicant / status / currentStep | 查看 / 审批 / 撤回 |
| 9 | **FollowTask** (待办) | title / owner / dueAt / status / bizType | 查看 / 改派 / 关闭 |
| 10 | **AuditLog** (审计) | userId / action / entity / entityId / timestamp | 查看（只读） |

### 3.3 Customer 页面示例

```tsx
// src/pages/entities/customers/list.tsx
import { useTable, Select, EditButton, DeleteButton } from '@refinedev/antd';
import { Table, Tag, Input, Space } from 'antd';

export const CustomerList = () => {
  const { tableProps, setFilters } = useTable({
    resource: 'customers',
    filters: { initial: [{ field: 'isDeleted', operator: 'eq', value: false }] },
    sorters: { initial: [{ field: 'createdAt', order: 'desc' }] },
  });

  return (
    <Table {...tableProps} rowKey="id">
      <Table.Column dataIndex="bp" title="BP 号" />
      <Table.Column dataIndex="name" title="名称" />
      <Table.Column
        dataIndex="region"
        title="区域"
        render={(v) => <Tag color="blue">{v}</Tag>}
      />
      <Table.Column
        dataIndex="creditCents"
        title="授信(元)"
        render={(v) => (Number(v) / 100).toFixed(2)}
      />
      <Table.Column
        title="操作"
        render={(_, record) => (
          <Space>
            <EditButton recordId={record.id} />
            <DeleteButton recordId={record.id} />
          </Space>
        )}
      />
    </Table>
  );
};
```

---

## 4. 8 业务表单清单

| # | 表单 | 字段 | 状态机 | 提交后动作 |
|---|---|---|---|---|
| 1 | 询价 (Inquiry) | 客户、物料、数量、有效期 | DRAFT → SUBMITTED → QUOTED → CLOSED | 生成报价 |
| 2 | 报价 (Quotation) | 询价、单价、税率、条款 | DRAFT → SUBMITTED → APPROVED → CLOSED | 生成合同 |
| 3 | 合同 (Contract) | 客户、报价、生效期、附件 | DRAFT → SUBMITTED → APPROVED → SIGNED → EFFECTIVE | 生成订单 |
| 4 | 配送 (Delivery) | 订单、收货地址、物流 | PENDING → DISPATCHED → IN_TRANSIT → DELIVERED | 通知客户 |
| 5 | 回单 (Receipt) | 订单、签收凭证 | PENDING → RECEIVED → CONFIRMED | 关闭订单 |
| 6 | 拜访 (Visit) | 客户、时间、签到、备注 | PLANNED → IN_PROGRESS → DONE | 关联客户画像 |
| 7 | AI 知识库 (Kb) | 标题、分类、文本、向量 | DRAFT → PUBLISHED → ARCHIVED | 喂入 RAG |
| 8 | SAP 字段映射 | SAP 字段、目标字段、转换 | DRAFT → ACTIVE → DEPRECATED | 同步任务用 |

每个表单都是独立状态机，详见 `docs/BACKEND.md` §X 状态机。

---

## 5. 报表

### 5.1 销售业绩

| 维度 | 指标 |
|---|---|
| 时间 | 月 / 季 / 年 |
| 组织 | 全公司 / 大区 / 区域 / 个人 |
| 指标 | GMV / 订单数 / 客户数 / 新客数 / 客单价 |

**图表**：
- 折线：GMV 趋势（按日 / 周）
- 柱状：区域 GMV 排行
- 表格：销售员明细

### 5.2 客户分析

| 维度 | 指标 |
|---|---|
| RFM | Recency / Frequency / Monetary 分桶 |
| 行业 | 行业 × GMV |
| 区域 | 区域 × 客户数 |
| 流失 | 90 天未下单客户清单 |

### 5.3 库存周转

| 维度 | 指标 |
|---|---|
| 周转率 | 周转率 = 销售成本 / 平均库存 |
| 呆滞 | 90 天未动销 SKU 清单 |
| 预警 | 库存 < 安全库存清单 |

### 5.4 实现

- 数据源：直接调后端聚合 API（避免后台解析大表）
- 缓存：仪表盘指标 Redis 60s 缓存
- 异步：复杂报表走 BullMQ（导出时也复用）

---

## 6. 导出

### 6.1 类型

| 类型 | 用途 | 实现 |
|---|---|---|
| Excel (xlsx) | 列表 / 报表 | 后端生成（S3 临时链接，5 分钟有效） |
| PDF | 合同 / 报表 | 服务端 puppeteer / 后端 PDF 库 |
| CSV | 大数据量（>10 万行） | 流式生成 |

### 6.2 异步导出流程

```
用户点击导出
   │
   ├─ 前端提交导出任务 → POST /admin/exports { type, filters }
   │
   ├─ 后端入队 BullMQ → 立即返回 taskId
   │
   ├─ 前端轮询 taskId（每 5s）直到完成
   │
   ├─ 完成后返回下载 URL（一次性，签名）
   │
   └─ 失败 → 错误码 + 重试按钮
```

### 6.3 飞书通知

```typescript
await feishuBot.sendToUser(user.feishuId, {
  msg_type: 'interactive',
  card: {
    header: { title: { tag: 'plain', content: '导出完成' } },
    elements: [
      { tag: 'div', text: { tag: 'lark_md', content: `订单列表(2026Q3).xlsx 已就绪` } },
      { tag: 'action', actions: [{ tag: 'button', text: { tag: 'plain', content: '下载' }, url: downloadUrl, type: 'primary' }] },
    ],
  },
});
```

---

## 7. 权限矩阵

### 7.1 角色

| 角色 | 简称 | 描述 |
|---|---|---|
| 系统管理员 | Admin | 全权限 |
| 财务 | FINANCE | 看业绩 / 收款 / 退款 |
| 大区经理 | REGION_MGR | 管本大区所有数据 |
| 销售员 | SALES | 看自己客户 / 订单 |
| 客服 | CS | 处理售后，无权改价 |

### 7.2 实体权限

| 实体 | Admin | FINANCE | REGION_MGR | SALES | CS |
|---|---|---|---|---|---|
| Customer | CRUD | R | R/U(本区) | R(自己) | R |
| Product | CRUD | R | R | R | R |
| Order | CRUD | R | R(本区) | R/U(自己) | R |
| Aftersale | CRUD | R/U(退款) | R/U(本区) | R(自己) | CRUD |
| User | CRUD | - | R/U(本区) | - | - |
| Region | CRUD | R | R/U(自己) | - | - |
| BizSubmission | CRUD | R/U(财务审批) | R/U(本区) | R(自己) | - |
| AuditLog | R | - | - | - | - |
| Report | R(全) | R(财务) | R(本区) | R(自己) | - |

### 7.3 字段级权限（accessProvider）

```typescript
// src/core/accessProvider.ts

export const accessProvider = {
  can: async ({ resource, action, params }) => {
    const user = getCurrentUser();

    // 销售员只能看自己客户
    if (resource === 'customers' && user.role === 'SALES') {
      return { can: action === 'show' || action === 'list', filters: [{ field: 'salesOwnerId', operator: 'eq', value: user.id }] };
    }

    // 金额字段对客服隐藏
    if (resource === 'aftersales' && user.role === 'CS') {
      return {
        can: true,
        fields: ['no', 'type', 'status', 'owner', 'customer.name'], // 隐藏 amount / cost
      };
    }

    return { can: true };
  },
};
```

### 7.4 操作审计

所有写操作（创建/编辑/删除/审批）记录到 `AuditLog`：

```typescript
{
  userId, action, resource, resourceId, before, after, ip, ua, timestamp
}
```

---

## 8. 部署

| 项 | 值 |
|---|---|
| 端口 | 4001 |
| 构建 | `pnpm build` 输出 dist/ |
| 部署 | nginx + S3 + CloudFront（静态） |
| 域名 | `https://admin.example.com` |
| 鉴权 | OAuth2（与主后端共用 Identity Server） |
| 性能预算 | 首屏 < 200KB gzipped，FCP < 1.5s |

### 8.1 与主后端的关系

- 1.0 阶段：mock 后端（MSW）独立可跑
- 2.0 阶段：接 NestJS 后端，复用 zod schema + openapi-typescript
- 鉴权 token：与小程序共用 Identity Server

---

## 9. 后续扩展

- 数据看板大屏（DataV 风格）— 单独部署
- AI 助手（运营问答、异常检测）— 走 AI 模块
- 移动端（主管外勤审批）— 复用小程序壳
- 自定义报表（用户拖拽配置）— 后续版本

---

## 10. 相关文档

- `docs/BACKEND.md` §模块清单 · §状态机
- `docs/API.md` §实体路由
- `docs/INTEGRATION.md` §字段映射
- `docs/OPERATIONS.md` §审计日志