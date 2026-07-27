# 销卓宝 · 设计 Token · v0.1

> 本文档定义外部 AI 出图所用 token,工程方应原样落地为 CSS 变量 / Flutter ThemeData / SwiftUI 颜色集。
> 颜色、字体、间距均有上限,新增需保留 n+1 原则(避免碎片化)。

---

## 1. 颜色(5 + 1 灯)

### 1.1 暖纸底色(primary)

| Token | Light | 用途 |
| --- | --- | --- |
| `--c-paper` | `#F2EBDF` | 整页大背景 |
| `--c-paper-2` | `#FBF6EC` | 卡片 / 抽屉 / 输入条(实体白) |
| `--c-paper-3` | `#EAE0CE` | 禁用态 / 边界色 |

### 1.2 文字 / 描边

| Token | 值 | 用途 |
| --- | --- | --- |
| `--c-ink` | `#16181B` | 标题 / 主文字 |
| `--c-ink-2` | `#3B434B` | 副文字 / 标签 |
| `--c-mute` | `#6F7780` | meta / 描述 |
| `--c-mute-2` | `#8E96A0` | 帧标签 / 提示 |
| `--c-line` | `#DCD2C2` | 边框(常规) |
| `--c-line-soft` | `#E6DFCF` | 边框(柔和) |

### 1.3 语义色(5 个,不多)

| Token | 值 | 含义 |
| --- | --- | --- |
| `--c-accent` | `#E8542C` | 主行动 / AI 元素 / 焦点 |
| `--c-accent-2` | `#C7431F` | 主按钮按下 / 渐变末端 |
| `--c-blue` | `#2E5A88` | 知识 / 引用 / 检索 |
| `--c-ok` | `#2E7D5B` | 成功 / 已预填 / 同步 |
| `--c-warn` | `#B07F1F` | 待补 / 提醒 / 跟进 |
| `--c-danger` | `#A8332B` | 错误 / 删除 / 警示 |

### 1.4 渐变光(背景 mesh,新增)

每个 `/ 12` 是 12% 透明度,作用是给玻璃底色有"光源"可读。

| Token | 起止 | 用途 |
| --- | --- | --- |
| `--bg-mesh-1` | `rgba(232,84,44,0.10)` 起点 → 透明 | 右上角暖光 |
| `--bg-mesh-2` | `rgba(46,90,136,0.08)` 起点 → 透明 | 左下角冷光 |
| `--bg-mesh-3` | `rgba(176,127,31,0.09)` 起点 → 透明 | 底部棕光 |

### 1.5 玻璃(新增,贴合 iOS 26 Liquid Glass)

| Token | 值 | 用途 |
| --- | --- | --- |
| `--glass-bg` | `rgba(255,253,248,0.62)` | 普通玻璃 |
| `--glass-bg-strong` | `rgba(255,253,248,0.82)` | 抽屉 / 弹窗 |
| `--glass-border` | `rgba(255,255,255,0.55)` | 玻璃边光 |
| `--glass-shadow` | `0 8px 32px rgba(60,40,20,0.10), 0 1px 0 rgba(255,255,255,0.6) inset` | 玻璃阴影 + 内高光 |
| `--glass-blur` | `blur(24px) saturate(180%)` | 模糊组合 |
| `--glass-blur-strong` | `blur(36px) saturate(200%)` | 抽屉模糊 |

### 1.6 语义色 10% 透明版(用于玻璃内 chip / 标签)

| Token | 配对 |
| --- | --- |
| `--tint-accent` | `rgba(232,84,44,0.10)` |
| `--tint-blue` | `rgba(46,90,136,0.10)` |
| `--tint-ok` | `rgba(46,125,91,0.10)` |
| `--tint-warn` | `rgba(176,127,31,0.12)` |
| `--tint-danger` | `rgba(168,51,43,0.10)` |

---

## 2. 字体(2 族 + 1 等宽)

| Token | 族 | 用途 |
| --- | --- | --- |
| `--ff-serif` | `"Noto Serif SC", "Source Han Serif SC", serif` | 标题 / 数字 / 强调 |
| `--ff-sans` | `"Noto Sans SC", "PingFang SC", system-ui, sans-serif` | 正文 / UI |
| `--ff-mono` | `"JetBrains Mono", ui-monospace, Consolas, monospace` | 时间 / 编号 / trace |

### 2.1 字号(5 档)

| Token | px | 用途 |
| --- | --- | --- |
| `--fs-display` | 22 | 屏主标题 / 数字大 |
| `--fs-h1` | 17 | 卡片标题 |
| `--fs-body` | 13 | 正文 / 列表 |
| `--fs-meta` | 11 | 描述 / 标签 |
| `--fs-mono-tag` | 10 | kicker / trace / 时间 |

### 2.2 字重(3 档)

| Token | 值 | 用途 |
| --- | --- | --- |
| `--fw-bold` | 700 | 标题 / 数字 |
| `--fw-regular` | 400 | 正文 |
| `--fw-mono` | 500 | 等宽 |

---

## 3. 间距(4 档)

| Token | px | 用途 |
| --- | --- | --- |
| `--s-1` | 4 | 极小间隔(icon ↔ 文字) |
| `--s-2` | 8 | 卡片内 / 网格 gap |
| `--s-3` | 12 | 卡片间 / 内 padding |
| `--s-4` | 16 | 大卡片 / 边距 |
| `--s-5` | 24 | 大段间距 |

> 实际使用多见 8 / 12 / 16,24 用于抽屉/浮层。

---

## 4. 圆角(6 档)

| Token | px | 用途 |
| --- | --- | --- |
| `--r-chip` | 8 | 小 chip / 输入条 |
| `--r-card` | 14 | 标准卡片 |
| `--r-card-lg` | 16 | 大卡 / 表单 |
| `--r-tab` | 18 | 玻璃面板 |
| `--r-drawer` | 24 | 抽屉顶角 |
| `--r-pill` | 999 | 按钮 / 标签 / 头像 |

---

## 5. 阴影(2 套)

| Token | 值 | 用途 |
| --- | --- | --- |
| `--sh-card` | `0 8px 32px rgba(60,40,20,0.10)` | 玻璃卡片 |
| `--sh-button` | `0 8px 24px rgba(232,84,44,0.45)` | 主按钮 |
| `--sh-button-inset` | `0 1px 0 rgba(255,255,255,0.6) inset` | 玻璃内高光 |

---

## 6. 视图尺寸

| 元素 | 尺寸 |
| --- | --- |
| 视口 | 390 × 844 |
| 状态栏 | 44 |
| 标题栏 | 44 |
| 输入条 | 56 |
| tabBar | 78 |
| 安全区 | 36 |
| 中央 AI 按钮 | 64 × 64 |

---

## 7. 落地参考

### 7.1 CSS

```css
:root {
  --c-paper: #F2EBDF;
  --c-paper-2: #FBF6EC;
  --c-accent: #E8542C;
  --c-blue: #2E5A88;
  --c-ok: #2E7D5B;
  --c-warn: #B07F1F;
  --c-danger: #A8332B;
  --glass-bg: rgba(255,253,248,0.62);
  --glass-shadow: 0 8px 32px rgba(60,40,20,0.10), 0 1px 0 rgba(255,255,255,0.6) inset;
  --ff-serif: "Noto Serif SC", "Source Han Serif SC", serif;
  --ff-sans: "Noto Sans SC", "PingFang SC", system-ui, sans-serif;
  --ff-mono: "JetBrains Mono", ui-monospace, Consolas, monospace;
  --r-card: 14px;
  --r-pill: 999px;
}
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.55);
  box-shadow: var(--glass-shadow);
  border-radius: var(--r-card);
}
```

### 7.2 Flutter

```dart
final tokens = {
  'paper': Color(0xFFF2EBDF),
  'accent': Color(0xFFE8542C),
  'glass': Color(0x99FFFDF8),  // 0.62 alpha
  'shadow': Color(0x1A3C2814),  // 0.10 alpha
};
```

### 7.3 SwiftUI

```swift
extension Color {
  static let paper = Color(0xFFF2EBDF)
  static let accent = Color(0xFFE8542C)
  static let paper2 = Color(0xFFFBF6EC)
}
```

---

## 8. 降级方案(低端机 / 微信 WebView 兼容性)

| 节点 | 降级为 |
| --- | --- |
| `backdrop-filter: blur(24px)` | `background: rgba(255,253,248,0.92)` 实色 |
| 渐变光 mesh | 单色 5% 灰 |
| `saturate(200%)` | 移除 |
| 中央 AI 按钮 64px | 56px |
| 抽屉 78% 高度 | 76% |

降级触发条件:`@supports not (backdrop-filter: blur(1px))` 或 Android WebView < 90。
