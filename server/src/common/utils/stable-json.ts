import { Prisma } from '@prisma/client';

export type JsonSafe = string | number | boolean | null | JsonSafe[] | { [key: string]: JsonSafe };

export function normalizeJson(value: unknown): JsonSafe {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeJson(item)]),
    );
  }
  if (typeof value === 'symbol') {
    return value.description ?? '';
  }
  if (typeof value === 'function') {
    return value.name;
  }
  return '';
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

export function toPrismaJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const normalized = normalizeJson(value);
  return normalized === null ? Prisma.JsonNull : (normalized as Prisma.InputJsonValue);
}
