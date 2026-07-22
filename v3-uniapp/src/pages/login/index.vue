<script setup lang="ts">
import { ref } from 'vue';
import { loginWithCredentials } from '../../api/client';
import IconBox from '../../components/IconBox/IconBox.vue';

const username = ref('');
const password = ref('');
const submitting = ref(false);
const errorMsg = ref('');

async function onSubmit() {
  if (submitting.value) return;
  if (!username.value.trim() || !password.value) {
    errorMsg.value = '请填写用户名和密码';
    return;
  }
  errorMsg.value = '';
  submitting.value = true;
  try {
    await loginWithCredentials(username.value.trim(), password.value);
    uni.showToast({ title: '登录成功', icon: 'success' });
    const pages = (typeof getCurrentPages === 'function' ? getCurrentPages() : []) as Array<unknown>;
    if (pages.length > 1) {
      uni.navigateBack();
    } else {
      uni.reLaunch({ url: '/pages/index/index' });
    }
  } catch (err: any) {
    errorMsg.value = err?.message || '登录失败，请重试';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="page">
    <view class="notch">
      <text>09:41</text>
      <text><text class="dot" />ONLINE</text>
      <text>v3.1</text>
    </view>
    <view class="brand">
      <view class="brand-mark">销</view>
      <text class="brand-title">销卓宝</text>
      <text class="brand-sub">业务员工作台 · v3.1</text>
    </view>

    <view class="form-card">
      <view class="form-head">
        <text class="form-title">登录</text>
        <text class="form-meta">使用账号密码登录</text>
      </view>
      <view class="form-body">
        <view class="field">
          <text class="field-label">用户名</text>
          <input
            v-model="username"
            class="field-input"
            placeholder="请输入用户名"
            placeholder-class="ph"
            :disabled="submitting"
            confirm-type="next"
          />
        </view>
        <view class="field">
          <text class="field-label">密码</text>
          <input
            v-model="password"
            class="field-input"
            password
            placeholder="请输入密码 (至少 8 位)"
            placeholder-class="ph"
            :disabled="submitting"
            confirm-type="done"
            @confirm="onSubmit"
          />
        </view>
        <view v-if="errorMsg" class="form-error">
          <IconBox name="complaint" :size="12" color="var(--c-danger)" />
          <text>{{ errorMsg }}</text>
        </view>
        <view class="form-btn" :class="{ disabled: submitting }" @click="onSubmit">
          <text>{{ submitting ? '登录中...' : '登录' }}</text>
        </view>
        <view class="form-tip">
          <text>测试账号 · zhangming / Xzb@2026!</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { background: var(--c-paper); min-height: 100vh; padding-bottom: 40px; }

.brand { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 0 32px; }
.brand-mark { width: 56px; height: 56px; border-radius: 14px; background: var(--c-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-family: var(--ff-display); font-size: 28px; font-weight: 700; }
.brand-title { font-family: var(--ff-display); font-size: 22px; font-weight: 700; color: var(--c-ink); }
.brand-sub { font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.08em; }

.form-card { margin: 0 16px; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); position: relative; overflow: hidden; }
.form-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c-accent); }
.form-head { display: flex; align-items: baseline; gap: 8px; padding: 16px 16px 12px; border-bottom: 1px dashed var(--c-line-soft); }
.form-title { font-family: var(--ff-display); font-size: 18px; font-weight: 700; color: var(--c-ink); }
.form-meta { font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.04em; }
.form-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.08em; text-transform: uppercase; }
.field-input { background: var(--c-paper); border: 1px solid var(--c-line); border-radius: var(--r-md); padding: 10px 12px; font-size: 14px; color: var(--c-ink); }
.ph { color: var(--c-mute); font-size: 13px; }
.form-error { display: flex; align-items: center; gap: 6px; color: var(--c-danger); font-size: 12px; padding: 6px 0; }
.form-btn { background: var(--c-accent); color: #fff; text-align: center; padding: 12px 0; border-radius: var(--r-md); font-size: 14px; font-weight: 600; }
.form-btn.disabled { opacity: 0.6; pointer-events: none; }
.form-tip { text-align: center; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); margin-top: 4px; }
</style>
