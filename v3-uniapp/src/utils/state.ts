/* 状态机 — 5 实体统一状态机定义 + 转移守卫
 * 实体：Order / Aftersale / BizSubmission
 * 详见 docs/BACKEND.md §X 状态机
 */

export type OrderStatus =
  | 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED'
  | 'CANCELED';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT:      ['SUBMITTED', 'CANCELED'],
  SUBMITTED:  ['CONFIRMED', 'CANCELED'],
  CONFIRMED:  ['SHIPPED', 'CANCELED'],
  SHIPPED:    ['COMPLETED'],
  COMPLETED:  [],
  CANCELED:   [],
};

export type AftersaleStatus =
  | 'PENDING' | 'OA_APPROVED' | 'SAP_CREATED' | 'PROCESSING' | 'CLOSED'
  | 'REJECTED';

export const AFTERSALE_TRANSITIONS: Record<AftersaleStatus, AftersaleStatus[]> = {
  PENDING:       ['OA_APPROVED', 'REJECTED'],
  OA_APPROVED:   ['SAP_CREATED', 'REJECTED'],
  SAP_CREATED:   ['PROCESSING', 'REJECTED'],
  PROCESSING:    ['CLOSED'],
  CLOSED:        [],
  REJECTED:      [],
};

export type BizSubmissionStatus =
  | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELED';

export const BIZ_TRANSITIONS: Record<BizSubmissionStatus, BizSubmissionStatus[]> = {
  DRAFT:      ['SUBMITTED', 'CANCELED'],
  SUBMITTED:  ['APPROVED', 'REJECTED'],
  APPROVED:   [],
  REJECTED:   [],
  CANCELED:   [],
};

/* 通用：判断转移是否合法 */
export function canTransition<S extends string>(map: Record<S, S[]>, from: S, to: S): boolean {
  return map[from]?.includes(to) ?? false;
}

/* 角色权限：谁可以转 */
export type Role = 'SALES' | 'FINANCE' | 'REGION_MGR' | 'ADMIN' | 'CS';

export const ORDER_TRANSITION_ROLES: Record<string, Role[]> = {
  'DRAFT->SUBMITTED':      ['SALES', 'REGION_MGR'],
  'DRAFT->CANCELED':       ['SALES'],
  'SUBMITTED->CONFIRMED':  ['FINANCE', 'ADMIN'],
  'SUBMITTED->CANCELED':   ['FINANCE', 'ADMIN', 'REGION_MGR'],
  'CONFIRMED->SHIPPED':    ['SALES', 'REGION_MGR', 'ADMIN'],
  'CONFIRMED->CANCELED':   ['FINANCE', 'ADMIN', 'REGION_MGR'],
  'SHIPPED->COMPLETED':    ['SALES', 'CS', 'REGION_MGR'],
};

export const AFTERSALE_TRANSITION_ROLES: Record<string, Role[]> = {
  'PENDING->OA_APPROVED':     ['FINANCE', 'ADMIN', 'REGION_MGR'],
  'PENDING->REJECTED':        ['FINANCE', 'ADMIN', 'REGION_MGR'],
  'OA_APPROVED->SAP_CREATED': ['ADMIN'],
  'OA_APPROVED->REJECTED':    ['FINANCE', 'ADMIN'],
  'SAP_CREATED->PROCESSING':  ['CS', 'SALES'],
  'SAP_CREATED->REJECTED':    ['FINANCE', 'ADMIN'],
  'PROCESSING->CLOSED':       ['CS', 'SALES', 'REGION_MGR'],
};


/* 发货单状态机 — 独立的转移图(不等于订单状态机) */

export type ShipmentStatus =
  | 'DRAFT' | 'SUBMITTED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELED';

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  DRAFT:      ['SUBMITTED', 'CANCELED'],
  SUBMITTED:  ['DISPATCHED', 'CANCELED'],
  DISPATCHED: ['DELIVERED', 'CANCELED'],
  DELIVERED:  [],
  CANCELED:   [],
};

export const SHIPMENT_TRANSITION_ROLES: Record<string, Role[]> = {
  'DRAFT->SUBMITTED':      ['SALES', 'REGION_MGR'],
  'DRAFT->CANCELED':       ['SALES', 'REGION_MGR'],
  'SUBMITTED->DISPATCHED': ['SALES', 'REGION_MGR', 'ADMIN'],
  'SUBMITTED->CANCELED':   ['FINANCE', 'ADMIN', 'REGION_MGR'],
  'DISPATCHED->DELIVERED': ['SALES', 'CS', 'REGION_MGR'],
  'DISPATCHED->CANCELED':  ['FINANCE', 'ADMIN'],
};

export function canRoleDo(role: Role, key: string): boolean {
  return (ORDER_TRANSITION_ROLES[key] ?? AFTERSALE_TRANSITION_ROLES[key] ?? []).includes(role);
}

/* 状态机按钮工具 — 前端渲染"可操作"按钮用 */
export interface ActionItem {
  key: string;
  label: string;
  target: string;
  accent?: boolean;
  danger?: boolean;
}

export function actionsFor<S extends string>(
  map: Record<S, S[]>,
  from: S,
  role: Role,
  roleMap: Record<string, Role[]>,
  labels: Record<string, { label: string; accent?: boolean; danger?: boolean }>,
): ActionItem[] {
  return map[from]
    .filter((to) => canRoleDo(role, `${from}->${to}`))
    .map<ActionItem>((to) => {
      const meta = labels[`${from}->${to}`] || { label: `${from}→${to}` };
      return { key: `${from}->${to}`, target: to, ...meta };
    });
}