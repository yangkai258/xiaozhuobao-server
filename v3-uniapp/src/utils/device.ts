/* 多端识别 — 详见 docs/FRONTEND.md §5 设备模式
 *
 * mp-mini     微信小程序（外勤）
 * mp-h5       浏览器 H5（手机）
 * desktop-h5  浏览器 H5（PC）
 */
export type DeviceMode = 'mp-mini' | 'mp-h5' | 'desktop-h5' | 'app-ios' | 'app-android';

export interface DeviceInfo {
  mode: DeviceMode;
  isMobile: boolean;
  isWeixin: boolean;
  isH5: boolean;
  width: number;
  height: number;
}

declare const wx: unknown;
declare const uni: { getSystemInfoSync: () => { platform: string; screenWidth: number; screenHeight: number } };

let cached: DeviceInfo | null = null;

export function detectDevice(): DeviceInfo {
  if (cached) return cached!;
  // #ifdef MP-WEIXIN
  cached = {
    mode: 'mp-mini',
    isMobile: true,
    isWeixin: true,
    isH5: false,
    width: 375,
    height: 812,
  };
  return cached!;
  // #endif
  // #ifdef H5
  const w = typeof window !== 'undefined' ? window.innerWidth : 375;
  const h = typeof window !== 'undefined' ? window.innerHeight : 812;
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
  const isWeixin = ua.includes('micromessenger');
  const isMobile = w < 768;
  cached = {
    mode: isMobile ? 'mp-h5' : 'desktop-h5',
    isMobile,
    isWeixin,
    isH5: true,
    width: w,
    height: h,
  };
  return cached!;
  // #endif
  cached = {
    mode: 'mp-h5',
    isMobile: true,
    isWeixin: false,
    isH5: false,
    width: 375,
    height: 812,
  };
  return cached!;
}

/** 单行 helper：判断是不是桌面 H5（PC 浏览器） */
export function isDesktop(): boolean {
  return detectDevice().mode === 'desktop-h5';
}

/** 单行 helper：是不是手机（任意端） */
export function isPhone(): boolean {
  const m = detectDevice().mode;
  return m === 'mp-mini' || m === 'mp-h5' || m === 'app-ios' || m === 'app-android';
}