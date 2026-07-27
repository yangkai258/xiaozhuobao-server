# 销卓宝 · 微交互规范 v0.1

> 提交日期:2026-07-25
> 适用:8 屏对话首页的微交互
> 目标:跨端(微信小程序 + iOS + Android)行为一致,工程方按此落地

---

## 0. 总原则

- **永不消失**:AI 任何状态都至少有 1 个可见指示(avatar / shimmer / 倒计时 / 队列号)
- **错误先保**:任何错误态先保存用户输入,再提示重试,不让用户重打
- **动作可撤销**:危险动作(删 / 改)有 5 秒内 undo 弹层

---

## 1. 输入条 5 态

| 状态 | 触发 | 视觉 | 交互 |
| --- | --- | --- | --- |
| **S0 idle** | 进入或清空 | 边框 `--c-line`,文字 `--c-mute`,发送键灰 | 点击输入框聚焦 |
| **S1 focus** | 输入框聚焦 | 边框 `--c-line-soft`,文字 `--c-mute`,光标橙色 1.5px | 弹键盘 |
| **S2 typing** | 用户输入字符 | 边框 `--c-accent`,文字 `--c-ink`,发送键橙色 | 字符进字符计数 |
| **S3 attachments** | 选附件后 | 输入条上方一行 chip,每 chip 36px 高 | 点 chip × 移除 |
| **S4 streaming** | AI 回复中 | 输入条边框 `--c-warn`,文字 `--c-warn`,AI 思考文字 | 二次发送会插队,但不打断流 |
| **S5 error** | 网络/4xx | 输入条红条 + trace id | 立即重试 / 排队重试 |

字符限制:**最多 500 字**,超过显示 `+N` 角标(轻提示,不阻断)。

---

## 2. 按钮反馈 4 阶段

| 阶段 | 时长 | 视觉 |
| --- | --- | --- |
| press | 0~120ms | 缩放 0.96 + 阴影变深 |
| ripple | 120~400ms | 中心向外径向 36px 圆形渐隐 |
| loading | 400ms~结束 | 主按钮内圈转 3 圈,文字换"处理中..." |
| success | 200ms | 绿色勾 + 文字换"完成",自动消失 |

主按钮(CTA)的 loading 不可被重复点击(防抖)。

---

## 3. 卡片按下态

玻璃卡片 3 种按下态:

- **default 态**:无变化
- **pressed 态**:整张卡 opacity 0.85,内阴影变深(0 0 0 1px inset 透明)
- **dragged 态**(长按 600ms):卡片缩放 1.02,出现删除 / 置顶 / 归档 的 3 chip 弹层

不区分 hover / pressed(微信小程序无 hover)。

---

## 4. 加载态 · 3 场景

### 4.1 冷启动(屏 1)

- 整页纸底瞬时显示(避免白闪)
- 欢迎卡 0.4s 内渐入(opacity 0→1,250ms)
- 6 场景卡 stagger 出现,每个延迟 50ms
- 整个动效 ≤ 0.7s

### 4.2 多模态识别(屏 3)

- 用户气泡立即出现(0ms)
- 名片缩略图 250ms 缩放进入
- 进度条 0~100% 用 1.4s easeOut 跑完
- 字段勾选 6 个,每个 100ms 间隔
- 总时长 ≤ 1.5s

### 4.3 AI 流式(屏 5 / 6 / 8)

- AI avatar 立即出现
- 文字按 token 流式逐字渲染(15ms / 字)
- avatar 旁有 5px 闪烁光点(1s 周期)
- 长回答时滚动条不动,只更新内容

---

## 5. 错误处理

### 5.1 错误态 4 类

| 类型 | 例子 | UI 表现 |
| --- | --- | --- |
| **网络层** | 断网 / 504 | 输入条红条 + 顶部 toast |
| **应用层** | 503 / 429 | 屏内红卡 + 倒计时 + 重试按钮 |
| **数据层** | OCR 失败 / 字段不全 | 字段高亮(边框 `--c-warn`) + 顶部提示 |
| **权限层** | 未登录 / 越权 | 跳转登录页 / 顶部 modal |

### 5.2 错误处理顺序

1. **保存用户输入**(localStorage / IndexedDB 兜底)
2. **显示错误**(不打断主屏)
3. **给重试入口**(无重试入口 = 错误态缺失)
4. **离线 fallback**(屏 8 展示本地可做)

---

## 6. 跳转

| 入口 | 目标 | 跳转方式 | 回退 |
| --- | --- | --- | --- |
| 6 场景卡 | 表单 / 列表页 | push | 左滑手势 |
| 用户气泡 + AI 气泡 | 会话详情 | push | 标题返回 |
| 中央 AI 按钮 | 对话首页 | switchTab(已在此) | — |
| 抽屉 | 历史会话 | sheet 浮层 | 下拉关闭 |
| 一键入库 | 客户详情 | replace | 不可回退 |

**总跳转次数**:
- 拍照 → 入库:3 屏(对话 → 拍照 → 识别 → 表单)→ 1 屏入库 = 4 跳
- 数据查询:对话 → KPI = 1 跳
- 知识问答:对话 → 引用 = 1 跳

评分点 §7-4 要求"≤ 2 跳",本方案 3~4 跳,实际是从"对话首页"算起,若从工作台算则 5+ 跳。**应考虑将拍照直跳表单,跳掉中间识别屏(屏 3 作为加载态而不是独立屏)**。

---

## 7. 触觉反馈(微信小程序)

| 动作 | 反馈 |
| --- | --- |
| 主按钮 | `wx.vibrateShort({type: "light"})` |
| 危险动作(删) | `wx.vibrateShort({type: "medium"})` |
| AI 思考结束 | `wx.vibrateShort({type: "light"})` |
| 错误 toast | 不震动(避免惊扰) |

iOS 用 `UIImpactFeedbackGenerator`,Android 用 `HapticFeedbackConstants`。

---

## 8. 滚动行为

- 屏 1 滚动:整页滚动,tabBar 固定
- 屏 5 数据查询:KPI 卡 sticky 在顶部,下方列表可滚
- 屏 7 抽屉:背景不动,只抽屉上滑
- 输入条:键盘弹起时,输入条跟随上滑,但不超过屏 1/2 高度

---

## 9. 动画时长规范

| 类别 | 时长 | 缓动 |
| --- | --- | --- |
| 微反馈(按钮 / 卡片按下) | 120ms | easeOut |
| 元素进入 | 250ms | easeOut |
| 元素退出 | 200ms | easeIn |
| 页面跳转 | 320ms | cubic-bezier(0.4, 0, 0.2, 1) |
| 抽屉上滑 | 280ms | cubic-bezier(0.16, 1, 0.3, 1) |

不出现 > 500ms 的动画(用户会觉得慢)。

---

## 10. 可访问性

- **对比度**:主文字 16.4:1,次文字 9.1:1,辅助文字 4.6:1(全部 ≥ AA)
- **焦点环**:键盘焦点时 2px 橙色实线,绝不能去掉
- **屏幕阅读**:每个场景卡的 `aria-label` 写明完整功能,不能只写"卡片"
- **减少动画**:iOS 系统开启"减弱动态效果"时,所有进入/退出动画降为 0ms

---

## 11. 不确定 / 留给工程方

- **微信小程序的 `backdrop-filter` 支持**:iOS 16+ 良好,Android WebView 90+ 部分支持,建议在 onLoad 时探测,降级为实色
- **图片懒加载**:6 场景卡的封面图(若有)用 `loading="lazy"`,在微信小程序的 image 组件里对应 `lazy-load`
- **滚动性能**:屏 5 / 6 列表超过 20 条时用 `recycle-view`,不能直接 v-for 全渲染
- **暗色模式切换**:用 `wx.getSystemInfo` 读 `theme`,同步到本地存储 key `theme_mode`,下次启动优先

---

## 12. 落地参考(伪代码)

```js
// 拍照 → 表单直跳(评分点 §7-4 改进方案)
async function handleTakePhoto() {
  const media = await wx.chooseMedia({count: 1, sourceType: ["camera"]});
  // 直接跳到表单页,识别作为加载态嵌入
  wx.redirectTo({url: "/pages/customer/new?mediaId=" + media.tempFiles[0].tempFilePath});
}

// 错误兜底
async function aiChat(input) {
  try {
    return await fetch("/ai/chat", {body: JSON.stringify({input})});
  } catch (e) {
    // 1. 保存输入
    wx.setStorageSync("ai_draft", input);
    // 2. 显示错误
    showErrorToast({code: e.code, message: e.message});
    // 3. 提供重试
    setTimeout(() => retry(input), 3000);
    // 4. 离线 fallback
    return {offline: true, suggestions: localSOP.search(input)};
  }
}
```
