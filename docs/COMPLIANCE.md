# 合规与上线检查 · 销卓宝 v1.1

> 版本：v1.1 · 2026-07-21
> 受众：架构师、产品、上线负责人
> 范围：微信小程序合规、ICP 备案、TLS、域名白名单、隐私协议、用户协议、数据合规、多端体验
> 对应：`docs/FRONTEND.md` 多端 device-mode · `docs/OPERATIONS.md` 数据保留

---

## 0. v1.1 变更摘要

| 区域 | v1.0 | v1.1 |
|---|---|---|
| 域名白名单 | 没提 | **三类白名单清单**（业务 / API / 文件下载） |
| TLS | 没提 | **1.2+ 强制**，自动化续签脚本 |
| ICP 备案 | 没提 | **流程 + 周期 + 风险** |
| 隐私协议 | 没提 | **前端 onLaunch 弹窗 + 用户协议页面** |
| 数据出境 | 没提 | **国内存储**，如需出境额外评估 |
| 多端体验 | 没分 | **外勤小程序 vs 桌面 H5** 设备模式定义 |

---

## 1. 微信小程序合规清单

### 1.1 域名白名单（必须）

在微信公众平台 → 开发管理 → 开发设置 → 服务器域名 配置：

| 类别 | 域名 | 用途 |
|---|---|---|
| request 合法域名 | `https://api.example.com` | API 调用 |
| request 合法域名 | `https://auth.example.com` | 鉴权 |
| uploadFile 合法域名 | `https://upload.example.com` | COS 直传（如果走前端中转） |
| downloadFile 合法域名 | `https://cdn.example.com` | 文件下载 |
| socket 合法域名 | （暂不使用） | - |
| 业务域名 | `https://h5.example.com` | H5 跳转 |

> **警告**：开发期 `localhost` 不能上线，必须替换为 HTTPS 域名。

### 1.2 备案要求

| 域名类型 | 备案 | 用途 |
|---|---|---|
| api.example.com | **ICP 备案**（工信部） | API 服务 |
| h5.example.com | **ICP 备案** | H5 页面 |
| 公安备案 | 30 天内接入 | 全部 |

**备案周期**：
- ICP 备案：7-20 个工作日
- 公安备案：3-5 个工作日
- 微信小程序认证：1-3 个工作日（首次）
- **总周期建议预留 1 个月**

### 1.3 TLS 要求

| 要求 | 实现 |
|---|---|
| TLS 1.2+ 强制 | nginx 配置 `ssl_protocols TLSv1.2 TLSv1.3;` |
| 证书品牌 | Let's Encrypt（免费，90 天）或 DigiCert（企业，1 年） |
| 续签 | certbot 自动续签 + 监控 30 天前告警 |
| HSTS | `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| OCSP Stapling | 启用 |
| HTTPS 重定向 | 80 → 443 强制 |

### 1.4 小程序类目选择

| 业务 | 类目 | 资质 |
|---|---|---|
| 销卓宝主功能 | 工具 → 效率 | 无 |
| 支付 | 工具 → 效率（不开通虚拟支付） | 无 |
| 即时通讯 | 无（不内嵌聊天） | - |

**不申请类目**：社交、金融、医疗（避免资质风险）。

---

## 2. 隐私协议

### 2.1 必须收集的信息（合规）

| 信息 | 用途 | 用户授权时机 |
|---|---|---|
| 微信 openid / unionid | 登录 | 登录页 |
| 手机号 | 业务联系 | 首次进入 |
| 位置信息 | 外勤签到 | 签到时 |
| 摄像头 / 相册 | 售后凭证上传 | 上传时 |
| 麦克风 | （暂不收集） | - |
| 通讯录 | （暂不收集） | - |

### 2.2 前端隐私弹窗（onLaunch 触发）

```vue
<!-- src/components/PrivacyModal.vue -->
<template>
  <view v-if="showModal" class="privacy-modal">
    <view class="privacy-card">
      <text class="title">用户协议与隐私政策</text>
      <scroll-view class="content">
        <text>在你使用销卓宝前，请阅读并同意：</text>
        <text>1. 《用户协议》</text>
        <text>2. 《隐私政策》</text>
        <text>我们仅收集业务必要信息...</text>
      </scroll-view>
      <button @click="reject">不同意并退出</button>
      <button open-type="agreePrivacyAuthorization"
              @agreeprivacyauthorization="onAgree">
        同意
      </button>
    </view>
  </view>
</template>
```

**强制要求**：
- 不同意 → 必须退出小程序（`wx.exitMiniProgram`）
- 用户选择持久化（uni.setStorageSync）
- 协议变更需重新弹窗

### 2.3 协议页面（必须可访问）

- `pages/agreement/user.vue` — 用户协议
- `pages/agreement/privacy.vue` — 隐私政策
- 个人中心 → 设置 → 关于 → 协议入口

### 2.4 后端日志脱敏

详见 `docs/OPERATIONS.md` §1.2 Pino redact 配置：

```typescript
redact: {
  paths: [
    'req.headers.authorization',
    'req.body.password',
    '*.phone',
    '*.idCard',
    '*.bankCard',
  ],
  censor: '[REDACTED]',
}
```

---

## 3. 数据合规

### 3.1 数据存储位置

| 数据类型 | 位置 | 备注 |
|---|---|---|
| 用户业务数据 | 国内（腾讯云 COS / 阿里云 OSS） | 必填 |
| 日志 | 国内 Loki | 必填 |
| 备份 | 国内 S3 | 必填 |
| 备份异地 | 异地（同国内区域） | 容灾 |

**禁止数据出境**（业务场景无必要）。

### 3.2 数据生命周期

| 数据 | 留存 | 删除 |
|---|---|---|
| 订单 | 永久（业务要求） | 用户销户后 90 天可申请 |
| 售后凭证 | 5 年 | 用户销户后 90 天可申请 |
| 操作日志 | 2 年 | 自动清理 |
| 登录日志 | 6 个月 | 自动清理 |
| 鉴权 token | 30 天 | 过期即失效 |
| 用户头像 | 用户销户后 30 天 | 自动清理 |

### 3.3 用户销户流程

```
用户申请销户 → 客服审核（24h）→ 校验无未结业务
   │
   ├─ 通过 → 标记用户 disabled = true（软删除） → 30 天后清理 PII
   │
   └─ 拒绝 → 通知用户原因（如有未结订单）
```

### 3.4 数据导出 / 删除申请

- 用户可申请导出本人数据（GDPR 风格，国内也适用）
- 后端 7 天内提供 JSON 压缩包
- 通过加密邮件发送（一次性下载链接）

---

## 4. 多端体验差异

### 4.1 设备模式定义

| 模式 | 设备 | 场景 | UI 优先级 |
|---|---|---|---|
| `mp-mini` | 微信小程序（手机） | 外勤 | 任务流、扫码、签到 |
| `mp-h5` | 浏览器 H5（手机） | 内部测试 | 同上 |
| `desktop-h5` | 浏览器 H5（PC） | 桌面办公 | 表格、报表、批量操作 |
| `desktop-native` | （未来）Electron | 高级功能 | - |

### 4.2 前端识别

```typescript
// src/utils/device.ts

export type DeviceMode = 'mp-mini' | 'mp-h5' | 'desktop-h5';

export function detectDeviceMode(): DeviceMode {
  // #ifdef MP-WEIXIN
  return 'mp-mini';
  // #endif

  // #ifdef H5
  if (window.innerWidth < 768) return 'mp-h5';
  return 'desktop-h5';
  // #endif
}
```

### 4.3 UI 适配策略

| 元素 | 移动端 (mp-mini / mp-h5) | 桌面端 (desktop-h5) |
|---|---|---|
| 顶部导航 | 系统原生 + 自定义胶囊 | 浏览器原生 |
| 底部 Tab | 4 tabBar（外勤快速入口） | 左侧抽屉（功能全展示） |
| 表格 | 卡片列表 | DataGrid（Ant Design） |
| 弹窗 | 全屏页 | 居中模态 |
| 字体 | 14px 基础 | 13px 基础（信息密度高） |
| 按钮 | 大（44px 高） | 标准（32px 高） |
| 输入 | 软键盘适配 | 桌面键盘快捷键 |

### 4.4 功能差异

| 功能 | 移动端 | 桌面端 |
|---|---|---|
| 扫码录单 | 是 | 否 |
| 拍照上传凭证 | 是 | 是（文件选择） |
| 批量导入 Excel | 否 | 是 |
| 复杂报表 | 简版 | 完整版 |
| 审批流程 | 简版（3 步） | 完整版（任意步骤） |
| 离线暂存 | 是 | 否 |
| 桌面通知 | 否 | 是（Web Notification） |

---

## 5. 上线检查清单（Go-Live）

### 5.1 必须项（P0）

- [ ] 域名已 ICP 备案
- [ ] 域名已公安备案
- [ ] TLS 1.2+ 证书有效
- [ ] 后端全链路 HTTPS
- [ ] 微信小程序类目已选
- [ ] 隐私协议 + 用户协议页面可访问
- [ ] onLaunch 隐私弹窗工作正常
- [ ] 域名白名单已配置（含 CDN 域名）
- [ ] 用户协议 / 隐私政策 PDF 已上传微信后台
- [ ] 客服微信 / 反馈入口已加
- [ ] 错误码测试通过（与微信审核不冲突）
- [ ] 真机测试覆盖 iOS / Android / 微信版本

### 5.2 重要项（P1）

- [ ] 数据备份已验证
- [ ] 监控 / 告警已配置
- [ ] 飞书告警群已建
- [ ] 值班表已排
- [ ] 灰度策略已定（前 100 用户）
- [ ] 回滚方案已演练
- [ ] 客服 FAQ 已整理
- [ ] 用户培训材料已备

### 5.3 可选项（P2）

- [ ] Lighthouse 性能 > 80
- [ ] 首屏 < 1MB
- [ ] P95 延迟 < 500ms
- [ ] 缓存命中率 > 70%

---

## 6. 持续合规运营

| 项 | 频率 | 负责人 |
|---|---|---|
| 证书续签检查 | 每日 | SRE |
| 域名备案到期 | 每季度 | 运维 |
| 隐私协议更新 | 随业务变更 | 法务 + 产品 |
| 类目审核 | 微信政策变更时 | 产品 |
| 用户数据导出请求 | 7 天 SLA | 客服 |
| 安全漏洞修复 | 24h 内（高危） | 开发 |

---

## 7. 风险与备案

### 7.1 已知风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 微信小程序审核被拒 | 上线延迟 | 提前 2 周送审；预留 review 周期 |
| ICP 备案驳回 | 上线延迟 1-2 周 | 提前准备资料；选合规主体 |
| 隐私协议更新未通知 | 合规风险 | 后端订阅 + 用户重新授权 |
| 数据泄露 | 严重 | 加密 + 脱敏 + 审计 |

### 7.2 紧急联系

- 工信部 ICP 备案客服：010-6641XXXXX
- 微信小程序客服：kf.qq.com
- 公安备案咨询：当地网安部门

---

## 8. 相关文档

- `docs/FRONTEND.md` §多端 device mode
- `docs/BACKEND.md` §鉴权 + §审计日志
- `docs/OPERATIONS.md` §备份 + §日志保留