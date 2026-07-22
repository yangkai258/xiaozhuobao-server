/* 业务错误解码 — v1.1 段位
 * 1xxxx 业务错误
 * 2xxxx 鉴权错误
 * 4xxxx 客户端校验错误
 * 5xxxx 服务端错误
 */
export type BizErrorCode =
  | number
  | string;

export interface BizError {
  http: number;
  code: BizErrorCode;
  msg: string;
  traceId?: string;
  details?: unknown;
}

export class BizError extends Error {
  http: number;
  code: BizErrorCode;
  traceId?: string;
  details?: unknown;
  constructor(opts: { http: number; code: BizErrorCode; msg: string; traceId?: string; details?: unknown }) {
    super(opts.msg);
    this.name = 'BizError';
    this.http = opts.http;
    this.code = opts.code;
    this.traceId = opts.traceId;
    this.details = opts.details;
  }
}

/** 段位 → 用户友好提示（前端 toast） */
export function friendlyMessage(code: BizErrorCode, raw: string): string {
  const c = String(code);
  if (raw && raw !== 'ok') return raw;
  if (c.startsWith('1')) {
    if (c === '10001') return '数据已被他人修改，请刷新后重试';
    if (c === '10401') return '未登录，请重新登录';
    if (c === '10404') return '资源不存在或已删除';
    if (c === '10413') return '文件过大，请压缩后再上传';
    if (c === '10422') return '当前状态不允许此操作';
    if (c === '10429') return '操作过于频繁，请稍后再试';
    return '业务规则校验未通过';
  }
  if (c.startsWith('2')) {
    if (c === '20101') return '登录已过期，请重新登录';
    if (c === '20103') return '当前账号无此操作权限';
    if (c === '20429') return '请求过于频繁，请稍后再试';
    return '鉴权失败';
  }
  if (c.startsWith('4')) return '请求参数有误';
  if (c.startsWith('5')) return '服务暂不可用，请稍后再试';
  return '操作失败';
}

/** 错误是不是鉴权过期（要触发登录跳转） */
export function isAuthExpired(code: BizErrorCode): boolean {
  const c = String(code);
  return c === '20101' || c === '10401';
}

/** 错误是不是版本冲突（要刷新） */
export function isVersionConflict(code: BizErrorCode): boolean {
  return String(code) === '10001';
}

/** 错误是不是网络问题（要重试） */
export function isRetryable(err: unknown): boolean {
  if (!(err instanceof BizError)) return true;
  return err.http >= 500 || err.http === 0;
}