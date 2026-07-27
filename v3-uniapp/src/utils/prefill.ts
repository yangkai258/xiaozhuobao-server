// ponytail: phase one payload fits in 2KB URL param; bigger payloads land in localStorage keyed by random.
const MAX_INLINE = 2 * 1024;

function trimBase64Padding(value: string): string {
  while (value.endsWith("=")) value = value.slice(0, -1);
  return value;
}

function toUrlSafe(value: string): string {
  return trimBase64Padding(value).split("+").join("-").split("/").join("_");
}

function fromUrlSafe(value: string): string {
  const normalized = value.split("-").join("+").split("_").join("/");
  return normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
}

function b64UrlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  if (typeof btoa === "function") {
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return toUrlSafe(btoa(binary));
  }
  if (typeof uni !== "undefined") return toUrlSafe(uni.arrayBufferToBase64(bytes.buffer as ArrayBuffer));
  throw new Error("Base64 encoder unavailable");
}

function b64UrlDecode(s: string): string {
  const padded = fromUrlSafe(s);
  if (typeof atob === "function") {
    const binary = atob(padded);
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  }
  if (typeof uni !== "undefined") return new TextDecoder().decode(uni.base64ToArrayBuffer(padded));
  throw new Error("Base64 decoder unavailable");
}

export function prefillEncode(payload: unknown): string {
  const json = JSON.stringify(payload);
  if (json.length > MAX_INLINE) {
    const key = 'xzb_prefill_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    try { uni.setStorageSync(key, json); } catch { /* ignore quota */ }
    return 'key:' + key;
  }
  return b64UrlEncode(json);
}

export function prefillDecode(value: string): unknown {
  if (value.startsWith('key:')) {
    const key = value.slice(4);
    try { const raw = uni.getStorageSync(key); if (raw) return JSON.parse(raw as string); } catch { /* fallthrough */ }
    return null;
  }
  try { return JSON.parse(b64UrlDecode(value)); } catch { return null; }
}

export function buildPrefillUrl(targetUrl: string, payload: unknown): string {
  const token = prefillEncode(payload);
  const sep = targetUrl.includes('?') ? '&' : '?';
  return targetUrl + sep + 'prefill=' + encodeURIComponent(token);
}

export const PREFILL_MAX_INLINE = MAX_INLINE;
