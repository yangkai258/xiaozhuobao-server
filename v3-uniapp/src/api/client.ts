import { v4 as uuidv4 } from 'uuid';
import {
  CUSTOMERS, PRODUCTS, ORDERS, AI_MODULES, AFTERSALES,
  FOLLOW_TASKS, BIZ, UTILITIES,
} from '../mock/data';
import type { Order } from '../mock/data';
import { BizError, friendlyMessage } from '../utils/error';

const USE_MOCK = false;
const BASE = 'http://localhost:4000/api/v1';

/** W3C traceparent 生成（前端生成 trace_id，span_id 每次新建） */
function genTraceparent(): string {
  const traceId = uuidv4().replace(/-/g, '');
  const spanId = uuidv4().replace(/-/g, '').slice(0, 16);
  return `00-${traceId}-${spanId}-01`;
}

type Envelope<T> = { code: number; data: T; msg: string; traceId?: string };
type LoginData = { accessToken: string; refreshToken: string };
const TOKEN_KEY = 'xzb_access_token';
let authPromise: Promise<string> | null = null;

function request<T>(path: string, method: 'GET' | 'POST' = 'GET', data?: unknown, skipAuth = false): Promise<Envelope<T>> {
  return new Promise((resolve, reject) => {
    const send = (token?: string) => uni.request({
      url: BASE + path,
      method,
      data,
      header: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Accept-Language': 'zh-CN',
        traceparent: genTraceparent(),
        ...(method !== 'GET' ? { 'Idempotency-Key': uuidv4() } : {}),
      },
      success: (response) => {
        const body = response.data as Envelope<T>;
        if (body.code !== 0) return reject(new BizError({ http: response.statusCode, code: body.code, msg: friendlyMessage(body.code, body.msg), traceId: body.traceId }));
        resolve(body);
      },
      fail: (error) => reject(new BizError({ http: 0, code: 0, msg: String(error.errMsg || '网络连接失败') })),
    });
    if (skipAuth) return send();
    const stored = uni.getStorageSync(TOKEN_KEY);
    if (stored) return send(stored);
    if (!authPromise) authPromise = request<LoginData>('/auth/login', 'POST', { username: 'zhangming', password: 'Xzb@2026!' }, true).then((result) => { uni.setStorageSync(TOKEN_KEY, result.data.accessToken); return result.data.accessToken; });
    authPromise.then(send).catch(reject);
  });
}
/* ========== Mock 层（首期所有数据走 mock，后续切真接口） ========== */
function ok<T>(data: T): Promise<{ code: 0; data: T; msg: 'ok' }> {
  return Promise.resolve({ code: 0 as const, data, msg: 'ok' as const });
}

export const api_customers = {
  list: () => USE_MOCK ? ok({ items: CUSTOMERS, page: 1, size: 20, total: CUSTOMERS.length, hasMore: false }) : request<any>('/customers?page=1&size=100'),
  byId: (bp: string) => USE_MOCK ? ok(CUSTOMERS.find(c => c.bp === bp) ?? null) : request<any>(`/customers/${encodeURIComponent(bp)}`),
};

export const api_products = {
  list: async () => {
    if (USE_MOCK) return ok({ items: PRODUCTS, page: 1, size: 50, total: PRODUCTS.length, hasMore: false });
    const result = await request<any>('/products?page=1&size=100');
    return { ...result, data: { ...result.data, items: result.data.items.map((p: any) => ({ ...p, price: Number(p.priceCents) / 100 })) } };
  },
  byId: (no: string) => USE_MOCK ? ok(PRODUCTS.find(p => p.no === no) ?? null) : request<any>(`/products/${encodeURIComponent(no)}`),
};

function mapOrder(order: any): Order {
  return { no: order.no, cust: order.customerName, amt: Number(order.amtCents) / 100, status: order.status, qty: order.qty, date: order.orderDate };
}

export const api_orders = {
  list: async () => {
    if (USE_MOCK) return ok({ items: ORDERS, page: 1, size: 20, total: ORDERS.length, hasMore: false });
    const result = await request<any>('/orders?page=1&size=100');
    return { ...result, data: { ...result.data, items: result.data.items.map(mapOrder) } };
  },
  byId: async (no: string) => USE_MOCK ? ok(ORDERS.find(o => o.no === no) ?? null) : request<any>(`/orders/${encodeURIComponent(no)}`),
};

export const api_aftersales = {
  list: async () => {
    if (USE_MOCK) return ok({ items: AFTERSALES, page: 1, size: 20, total: AFTERSALES.length, hasMore: false });
    const result = await request<any>('/aftersales?page=1&size=100');
    return { ...result, data: { ...result.data, items: result.data.items.map((a: any) => ({ no: a.no, material: a.material, order: a.orderNo, reason: a.reason, status: a.status, date: a.occurredAt.slice(0, 10) })) } };
  },
};

export const api_workbench = {
  load: async () => {
    if (USE_MOCK) return ok({ biz: BIZ, todos: FOLLOW_TASKS, amt: 146283, delta: 0.124, amtWeek: ORDERS.reduce((s, o) => s + o.amt, 0) });
    const [report, todos] = await Promise.all([request<any>('/me/reports?period=MONTH'), request<any>('/follow/todos?page=1&size=20')]);
    return { code: 0 as const, msg: 'ok' as const, data: { biz: BIZ, todos: todos.data.items.map((t: any) => ({ h: t.title, sub: t.subtitle || '', node: t.node, due: t.dueAt ? t.dueAt.slice(0, 10) : t.status })), amt: Number(report.data.gmvCents) / 100, delta: 0, amtWeek: report.data.byWeek.reduce((sum: number, item: any) => sum + Number(item.gmvCents) / 100, 0) } };
  },
};

export const api_ai = {
  modules: () => USE_MOCK ? ok(AI_MODULES) : request<any>('/ai/modules'),
};

export const api_me = {
  profile: async () => {
    if (USE_MOCK) return ok({ id: 'u-001', displayName: '张明', role: 'SALES · 上海', avatar: 'M', region: '上海', util: UTILITIES });
    const [profile, utilities] = await Promise.all([request<any>('/me'), request<any>('/me/utilities')]);
    return { ...profile, data: { id: profile.data.id, displayName: profile.data.displayName, role: `${profile.data.role} · ${profile.data.region || ''}`, avatar: (profile.data.displayName || 'U').slice(0, 1), region: profile.data.region || '', util: utilities.data.map((u: any) => ({ ...u, icon: 'dot' })) } };
  },
};