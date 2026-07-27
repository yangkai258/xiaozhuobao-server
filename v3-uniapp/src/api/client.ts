import { v4 as uuidv4 } from 'uuid';
import {
  BIZ,
} from '../mock/data';
import { BizError, friendlyMessage } from '../utils/error';

// uni-app H5 reads Vite env at build time; falls back to local dev server
const BASE = ((((import.meta as any).env || {}).VITE_API_BASE_URL as string) || 'http://localhost:4000') + '/api/v1';
const TOKEN_KEY = 'xzb_access_token';
const REFRESH_KEY = 'xzb_refresh_token';

type Envelope<T> = { code: number; data: T; msg: string; traceId?: string };
type TokenPair = { accessToken: string; refreshToken: string };
type AnyRecord = Record<string, unknown>;

let accessToken = '';
let refreshToken = '';
let onUnauthorized: ((reason: 'expired' | 'refreshFailed') => void) | null = null;
let refreshing: Promise<TokenPair> | null = null;
let authNoticeSent = false;

function genTraceparent(): string {
  const traceId = uuidv4().replace(/-/g, '');
  const spanId = uuidv4().replace(/-/g, '').slice(0, 16);
  return `00-${traceId}-${spanId}-01`;
}

function loadTokens(): void {
  try {
    accessToken = (uni.getStorageSync(TOKEN_KEY) as string) || '';
    refreshToken = (uni.getStorageSync(REFRESH_KEY) as string) || '';
  } catch {
    accessToken = '';
    refreshToken = '';
  }
}

function saveTokens(pair: TokenPair): void {
  accessToken = pair.accessToken;
  refreshToken = pair.refreshToken;
  try {
    uni.setStorageSync(TOKEN_KEY, pair.accessToken);
    uni.setStorageSync(REFRESH_KEY, pair.refreshToken);
  } catch {
    // 忽略持久化错误，前端仍能继续使用内存中的 token
  }
}

export function clearTokens(): void {
  accessToken = '';
  refreshToken = '';
  try {
    uni.removeStorageSync(TOKEN_KEY);
    uni.removeStorageSync(REFRESH_KEY);
  } catch {
    // 忽略持久化错误
  }
}

export function setAuthNotifier(handler: (reason: 'expired' | 'refreshFailed') => void): void {
  onUnauthorized = handler;
}

function toBizError(http: number, code: number, msg: string, traceId?: string): BizError {
  return new BizError({ http, code, msg: friendlyMessage(code, msg), traceId });
}

function rawRequest<T>(path: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', data?: unknown, tokenOverride?: string, skipAuth = false, extraHeaders?: AnyRecord): Promise<Envelope<T>> {
  return new Promise((resolve, reject) => {
    const headers: AnyRecord = {
      'Accept-Language': 'zh-CN',
      traceparent: genTraceparent(),
    };
    if (!skipAuth) {
      const token = tokenOverride ?? accessToken;
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    if (method !== 'GET') headers['Idempotency-Key'] = uuidv4();
    if (extraHeaders) Object.assign(headers, extraHeaders);
    uni.request({
      url: BASE + path,
      method: method as UniNamespace.RequestOptions['method'],
      data: data as UniNamespace.RequestOptions['data'],
      header: headers,
      success: (response) => {
        const body = response.data as Envelope<T>;
        if (body.code !== 0) return reject(toBizError(response.statusCode, body.code, body.msg, body.traceId));
        resolve(body);
      },
      fail: (error) => reject(new BizError({ http: 0, code: 0, msg: String(error.errMsg || '网络连接失败') })),
    });
  });
}

async function refreshTokens(): Promise<TokenPair> {
  if (!refreshToken) throw new BizError({ http: 401, code: 20100, msg: '请先登录' });
  if (!refreshing) {
    refreshing = rawRequest<TokenPair>('/auth/refresh', 'POST', { refreshToken }, '', true)
      .then((res) => {
        const pair = res.data;
        saveTokens(pair);
        return pair;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}


export async function request<T>(path: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', data?: unknown, extraHeaders?: AnyRecord): Promise<Envelope<T>> {
  if (!accessToken) loadTokens();
  try {
    return await rawRequest<T>(path, method, data, undefined, false, extraHeaders);
  } catch (error) {
    if (error instanceof BizError && (error.code === 20100 || error.code === 20104)) {
      if (!refreshToken) {
        clearTokens();
        if (onUnauthorized && !authNoticeSent) { authNoticeSent = true; onUnauthorized('expired'); }
        throw error;
      }
      try {
        await refreshTokens();
        return await rawRequest<T>(path, method, data, undefined, false, extraHeaders);
      } catch (refreshError) {
        clearTokens();
        if (onUnauthorized && !authNoticeSent) { authNoticeSent = true; onUnauthorized('refreshFailed'); }
        throw refreshError;
      }
    }
    throw error;
  }
}

export async function loginWithCredentials(username: string, password: string): Promise<TokenPair> {
  const res = await rawRequest<TokenPair>('/auth/login', 'POST', { username, password }, '', true);
  saveTokens(res.data);
  authNoticeSent = false;
  return res.data;
}

export async function logout(): Promise<void> {
  try { await rawRequest<void>('/auth/logout', 'POST', undefined); } catch { /* 即使失败也要清空本地 */ }
  clearTokens();
}

/* ========== 业务 API ========== */

export const api_customers = {
  list: () => request<any>('/customers?page=1&size=100'),
  byId: (id: string) => request<any>(`/customers/${encodeURIComponent(id)}`),
};

export const api_products = {
  list: async () => {
    const result = await request<any>('/products?page=1&size=100');
    return { ...result, data: { ...result.data, items: result.data.items.map((p: any) => ({ ...p, price: Number(p.priceCents) / 100 })) } };
  },
  byId: (id: string) => request<any>(`/products/${encodeURIComponent(id)}`),
};

export const api_orders = {
  list: async () => {
    const result = await request<any>('/orders?page=1&size=100');
    return { ...result, data: { ...result.data, items: result.data.items.map((o: any) => ({ no: o.no, cust: o.customerName, amt: Number(o.amtCents) / 100, status: o.status, qty: o.qty, date: o.orderDate })) } };
  },
  byId: (id: string) => request<any>(`/orders/${encodeURIComponent(id)}`),
  // PATCH /orders/:id/status — If-Match is the order's current version; server returns 10009 on mismatch
  updateStatus: (id: string, status: string, version: number, remark?: string) =>
    request<any>(`/orders/${encodeURIComponent(id)}/status`, 'PATCH', { status, remark }, { 'If-Match': String(version) }),
};

export const api_aftersales = {
  list: async () => {
    const result = await request<any>('/aftersales?page=1&size=100');
    return { ...result, data: { ...result.data, items: result.data.items.map((a: any) => ({ no: a.no, material: a.material, order: a.orderNo, reason: a.reason, status: a.status, date: a.occurredAt.slice(0, 10) })) } };
  },
  byId: (id: string) => request<any>(`/aftersales/${encodeURIComponent(id)}`),
  // PATCH /aftersales/:id/status — same If-Match pattern as orders
  updateStatus: (id: string, status: string, version: number, remark?: string) =>
    request<any>(`/aftersales/${encodeURIComponent(id)}/status`, 'PATCH', { status, remark }, { 'If-Match': String(version) }),
};

export const api_projects = {
  list: () => request<any>('/projects?page=1&size=100'),
  byId: (id: string) => request<any>(`/projects/${encodeURIComponent(id)}`),
};

export const api_contracts = {
  list: () => request<any>('/contracts?page=1&size=100'),
  byId: (id: string) => request<any>(`/contracts/${encodeURIComponent(id)}`),
};

export const api_dicts = {
  byKind: (kind: string) => request<any>(`/dicts?kind=${encodeURIComponent(kind)}`),
};

export const api_biz = {
  list: (query: { kind?: string; filter_status?: string; page?: number; size?: number } = {}) => {
    const q = new URLSearchParams();
    if (query.kind) q.set('kind', query.kind);
    if (query.filter_status) q.set('filter_status', query.filter_status);
    if (query.page) q.set('page', String(query.page));
    if (query.size) q.set('size', String(query.size));
    const qs = q.toString();
    return request<any>(`/biz${qs ? '?' + qs : ''}`);
  },
  summary: (kind?: string) => request<any>(`/biz/summary${kind ? '?kind=' + encodeURIComponent(kind) : ''}`),
  create: (kind: string, body: unknown) => request<any>(`/biz/${encodeURIComponent(kind)}`, 'POST', body),
  // PATCH /biz/:id/status — If-Match version; body shape { status, remark? }
  updateStatus: (id: string, status: string, version: number, remark?: string) =>
    request<any>(`/biz/${encodeURIComponent(id)}/status`, 'PATCH', { status, remark }, { 'If-Match': String(version) }),
};

export const api_workbench = {
  load: async () => {
    const safe = async <T,>(call: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await call(); } catch { return fallback; }
    };
    const [report, todos, summary] = await Promise.all([
      safe(() => request<any>('/me/reports?period=MONTH'), { data: { gmvCents: '0', orderCount: '0', aftersaleCount: '0', completion: 0, byWeek: [] } } as any),
      safe(() => request<any>('/follow/todos?page=1&size=20'), { data: { items: [] } } as any),
      safe(() => request<any>('/biz/summary'), { data: { items: [] } } as any),
    ]);
    const summaryByKind: Record<string, { total: number; byStatus: Record<string, number> }> = {};
    for (const row of summary.data.items) {
      summaryByKind[row.kind] = { total: row.total, byStatus: row.byStatus };
    }
    return {
      code: 0 as const,
      msg: 'ok' as const,
      data: {
        biz: BIZ.map((b) => {
          const row = summaryByKind[b.en];
          const total = row?.total ?? 0;
          const pending = row?.byStatus?.PENDING ?? 0;
          return { ...b, count: String(total), pending: String(pending) };
        }),
        todos: todos.data.items.map((t: any) => ({ h: t.title, sub: t.subtitle || '', node: t.node, due: t.dueAt ? t.dueAt.slice(0, 10) : t.status })),
        amt: Number(report.data.gmvCents) / 100,
        delta: 0,
        amtWeek: report.data.byWeek.reduce((sum: number, item: any) => sum + Number(item.gmvCents) / 100, 0),
        gmvCents: report.data.gmvCents,
        orderCount: report.data.orderCount,
        aftersaleCount: report.data.aftersaleCount,
        completion: report.data.completion,
      },
    };
  },
};

export interface InvokePayload {
  prompt: string;
  context?: AnyRecord;
  attachments?: Array<{ fileId: string; kind: 'image' | 'file' }>;
  intentHints?: Array<'customer_qualification' | 'data_query' | 'kb_query' | 'draft'>;
}

export const api_ai = {
  modules: () => request<any>('/ai/modules'),
  invoke: (module: string, payload: InvokePayload) => request<any>(`/ai/${module}/invoke`, 'POST', payload),
  history: (module: string) => request<any>(`/ai/${module}/history`),
};

export const api_feature = {
  // ponytail: phase one returns AI_HOME only; phase two broadens to per-feature flags.
  get: () => request<{ AI_HOME: boolean }>('/feature'),
};

export const api_storage_ai = {
  // ponytail: dedicated endpoint that caps AI attachments at 8MB and accepts image/jpeg, image/png, application/pdf only.
  upload: (payload: { name: string; mimeType: string; base64: string }) => request<any>('/storage/upload-ai', 'POST', payload),
};

export const api_me = {
  profile: async () => {
    const [profile, utilities] = await Promise.all([request<any>('/me'), request<any>('/me/utilities')]);
    return {
      ...profile,
      data: {
        id: profile.data.id,
        displayName: profile.data.displayName,
        role: profile.data.role,
        region: profile.data.region || '',
        avatar: (profile.data.displayName || 'U').slice(0, 1),
        util: utilities.data.map((u: any) => ({ ...u, icon: 'dot' })),
      },
    };
  },
  reports: (period: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' = 'MONTH') => request<any>(`/me/reports?period=${period}`),
};