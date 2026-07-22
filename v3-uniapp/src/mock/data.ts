// 种子数据 —— 从 v2 原型迁移

export interface Customer {
  bp: string;
  code: string;
  name: string;
  status: '已生效' | '审批中' | '已驳回';
  contact: string;
  addr: string;
  cat: '客户' | '经销商';
}

export interface Product {
  no: string;
  name: string;
  spec: string;
  cat: '防水材料' | '节能材料' | '辅材';
  stock: number;
  price: number;
  unit: string;
}

export interface Order {
  no: string;
  cust: string;
  amt: number;
  status: '已发货' | '待确认' | '已确认' | '已完成' | '已取消';
  qty: string;
  date: string;
}

export interface Aftersale {
  no: string;
  material: string;
  order: string;
  reason: '质量问题' | '发错货' | '破损' | '其他';
  status: '待 OA 审批' | 'SAP 已建单' | '处理中' | '已关闭' | '已驳回';
  date: string;
}

export interface AIModule {
  id: string;
  num: string;
  name: string;
  desc: string;
  color: string;
}

export interface Utility {
  id: string;
  icon: string;
  name: string;
  desc: string;
  color: string;
}

export interface Biz {
  mark: string;
  name: string;
  en: string;
  color: string;
  path: string;
}

export interface FollowTask {
  h: string;     // 标题
  sub: string;   // 副标题
  node: string;  // 当前节点
  due: string;   // 期限 / 状态
}

export const CUSTOMERS: Customer[] = [
  { bp: 'BP100001', code: 'C-2026-001', name: '上海建工建材有限公司', status: '已生效', contact: '张工 · 15938000123', addr: '上海浦东新区', cat: '客户' },
  { bp: 'BP100002', code: 'C-2026-002', name: '深圳南方装饰工程部', status: '已生效', contact: '王经理 · 17613880099', addr: '深圳福田区', cat: '客户' },
  { bp: 'BP100003', code: 'C-2026-003', name: '东莞旗卷贸易有限公司', status: '审批中', contact: '陈总 · 13922567701', addr: '东莞南城', cat: '经销商' },
  { bp: 'BP100004', code: 'C-2026-004', name: '广州雄驰材料旗舰店', status: '审批中', contact: '林老板 · 13680239855', addr: '广州天河', cat: '经销商' },
  { bp: 'BP100005', code: 'C-2026-005', name: '佛山雄冠建材有限公司', status: '已生效', contact: '郑总 · 13902247766', addr: '佛山福宁区', cat: '客户' },
  { bp: 'BP100006', code: 'C-2026-006', name: '济南裕丰工程有限公司', status: '已驳回', contact: '赵工 · 15363219887', addr: '济南历下', cat: '客户' },
];

export const PRODUCTS: Product[] = [
  { no: '3001-005-01', name: 'K11 通用型防水涂料 20kg', spec: '通用型', cat: '防水材料', stock: 320, price: 244.80, unit: '桶' },
  { no: '3001-008-02', name: 'JS 聚合物防水涂料 18kg', spec: '聚合物', cat: '防水材料', stock: 5, price: 338.00, unit: '桶' },
  { no: '3002-001-01', name: '水泥基渗透型防水剂 25kg', spec: '水泥基', cat: '防水材料', stock: 180, price: 198.00, unit: '桶' },
  { no: '3002-005-01', name: '高韧性防水卷材 1.5mm', spec: '1.5mm', cat: '防水材料', stock: 45, price: 88.00, unit: '㎡' },
  { no: '4001-002-01', name: '外墙保温罐板 50mm', spec: '50mm', cat: '节能材料', stock: 220, price: 56.00, unit: '块' },
  { no: '4001-005-01', name: '内墙保温板 30mm', spec: '30mm', cat: '节能材料', stock: 310, price: 38.00, unit: '块' },
  { no: '5001-001-01', name: '防水涂料多纳事子板 50L', spec: '50L', cat: '辅材', stock: 65, price: 124.00, unit: '个' },
  { no: '5001-002-01', name: '保温钉 100mm', spec: '100mm', cat: '辅材', stock: 880, price: 2.40, unit: '个' },
];

export const ORDERS: Order[] = [
  { no: 'SO20260716-001', cust: '上海建工建材', amt: 12480.00, status: '已发货', qty: '2 行 · 15 件', date: '2026-07-14' },
  { no: 'SO20260715-023', cust: '深圳南方装饰', amt: 5220.00, status: '待确认', qty: '1 行 · 5 件', date: '2026-07-15' },
  { no: 'SO20260712-008', cust: '东莞旗卷贸易', amt: 8750.00, status: '已完成', qty: '3 行 · 22 件', date: '2026-07-12' },
  { no: 'SO20260711-015', cust: '广州雄驰材料', amt: 18200.00, status: '待确认', qty: '4 行 · 28 件', date: '2026-07-11' },
  { no: 'SO20260709-021', cust: '佛山雄冠建材', amt: 6580.00, status: '已完成', qty: '2 行 · 12 件', date: '2026-07-09' },
];

export const AFTERSALES: Aftersale[] = [
  { no: 'AF20260716-005', material: 'K11 防水涂料 · 10 桶', order: 'SO20260710-012', reason: '质量问题', status: '待 OA 审批', date: '2026-07-16' },
  { no: 'AF20260714-003', material: 'JS 聚合物 · 5 桶', order: 'SO20260708-006', reason: '发错货', status: 'SAP 已建单', date: '2026-07-14' },
  { no: 'AF20260712-001', material: '水泥基渗透 · 3 桶', order: 'SO20260705-022', reason: '破损', status: '已关闭', date: '2026-07-12' },
];

export const AI_MODULES: AIModule[] = [
  { id: 'insight', num: '01', name: '客户洞察', desc: '买卖历史 + 预测', color: '#E8542C' },
  { id: 'quote',   num: '02', name: '智能报价', desc: 'SAP 价 + 毛利率预测', color: '#2E5A88' },
  { id: 'risk',    num: '03', name: '订单预警', desc: '发货 + 库存 + 质量警示', color: '#2E7D5B' },
  { id: 'after',   num: '04', name: '售后分析', desc: '原因归类 + 责任建议', color: '#B07F1F' },
  { id: 'kb',      num: '05', name: '知识助手', desc: '产品 + 技术 + 施工文档', color: '#5B6470' },
  { id: 'follow',  num: '06', name: '跟进助手', desc: '客户跟进 + 备忘', color: '#8A95A3' },
];

export const UTILITIES: Utility[] = [
  { id: 'profile',  icon: '·', name: '个人资料', desc: '姓名 / 职务 / 手机', color: '#0E1419' },
  { id: 'approval', icon: '·', name: '我的审批', desc: '待审批 · 已审批 · 我发起', color: '#E8542C' },
  { id: 'follow',   icon: '·', name: '跟进任务', desc: '客户跟进记录', color: '#2E5A88' },
  { id: 'report',   icon: '·', name: '业绩报表', desc: '个人 / 团队 / 区域', color: '#2E7D5B' },
  { id: 'settings', icon: '·', name: '设置', desc: '通知 / 密码 / 关于', color: '#B07F1F' },
  { id: 'help',     icon: '·', name: '帮助与反馈', desc: '使用文档 + FAQ', color: '#5B6470' },
  { id: 'sync',     icon: '·', name: '数据同步', desc: 'SAP / OA / 快达', color: '#8A95A3' },
  { id: 'team',     icon: '·', name: '团队管理', desc: '同事 / 下属', color: '#0E1419' },
  { id: 'calendar', icon: '·', name: '日历', desc: '订单 / 跟进 / 审批日志', color: '#E8542C' },
];

export const BIZ: Biz[] = [
  { mark: '会', name: '会议推广',  en: 'MEETING',   color: '#E8542C', path: '/pages/meeting-new/index' },
  { mark: '备', name: '涂无忧备货', en: 'STOCKING',  color: '#2E5A88', path: '/pages/stocking-new/index' },
  { mark: '发', name: '无订单发货', en: 'SHIPMENT',  color: '#2E7D5B', path: '/pages/shipment-new/index' },
  { mark: '广', name: '广告申请',   en: 'ADVERT',    color: '#B07F1F', path: '/pages/advert-new/index' },
  { mark: '店', name: '建店核销',   en: 'STORE',     color: '#2E5A88', path: '/pages/store-new/index' },
  { mark: '补', name: '仓储补贴',   en: 'SUBSIDY',   color: '#2E7D5B', path: '/pages/subsidy-new/index' },
  { mark: '租', name: '设备租赁',   en: 'RENTAL',    color: '#E8542C', path: '/pages/rental-new/index' },
  { mark: '诉', name: '外部投诉',   en: 'COMPLAINT', color: '#B07F1F', path: '/pages/complaint-new/index' },
];

export const FOLLOW_TASKS: FollowTask[] = [
  { h: '广州雄驰客申申请',     sub: '申请人：张明 · 今天 09:18', node: '销售负责人审批', due: '等待补资料' },
  { h: 'SO20260716-001 特价审批', sub: '客户：上海建工建材',   node: '财务价格审核',   due: '停留 6h' },
  { h: '销退申请 AF20260716-005', sub: '客户：深圳南方装饰',   node: '质量部门责任判定', due: '质量审核中' },
];

// 状态 → CSS 类（用于卡片徽章）
export function orderStatusClass(status: string): 'ok' | 'warn' | 'accent' | 'mute' {
  if (status.includes('已发货') || status.includes('已完成') || status.includes('已生效')) return 'ok';
  if (status.includes('待') || status.includes('审批')) return 'warn';
  if (status.includes('驳回') || status.includes('关闭') || status.includes('OA')) return 'accent';
  return 'mute';
}
