/* 金额 — DB BigInt / API string / 前端 Decimal
 * 详见 docs/API.md §3 + docs/FRONTEND.md §6
 */
import Decimal from 'decimal.js';

// decimal.js 配置 — 关闭科学计数法，统一小数
Decimal.set({ precision: 20, toExpNeg: -10, toExpPos: 21 });

/** "1248000" (cents) → "12,480.00" (yuan) */
export function centsToYuanString(cents: string | number | null | undefined): string {
  if (cents == null || cents === '') return '0.00';
  try {
    return new Decimal(cents).dividedBy(100).toFixed(2);
  } catch {
    return '0.00';
  }
}

/** 加千分位 */
export function formatYuan(amount: string | number | null | undefined, withComma = true): string {
  if (amount == null || amount === '') return '0.00';
  const fixed = typeof amount === 'string' ? amount : new Decimal(amount).toFixed(2);
  if (!withComma) return fixed;
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${grouped}.${dec}` : grouped;
}

/** cents 字符串 → 带千分位的"12,480.00" */
export function formatCents(cents: string | number | null | undefined): string {
  return formatYuan(centsToYuanString(cents), true);
}

/** 解析用户输入（"12,480.00" / "12480"） → cents 字符串 */
export function parseToCents(input: string): string {
  if (!input) return '0';
  const cleaned = input.replace(/[,\s¥]/g, '');
  return new Decimal(cleaned || '0').times(100).toFixed(0);
}

/** 安全相加（避免 JS 浮点） */
export function addCents(...cents: Array<string | number | null | undefined>): string {
  return cents.reduce<Decimal>((acc, c) => {
    if (c == null || c === '') return acc;
    return acc.plus(typeof c === 'string' ? c : new Decimal(c));
  }, new Decimal(0)).toFixed(0);
}