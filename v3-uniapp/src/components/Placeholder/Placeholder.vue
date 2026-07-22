<template>
  <view class="placeholder">
    <view class="ph-icon">
      <IconBox :name="icon" :size="28" :color="color"/>
    </view>
    <text class="ph-title">{{ title }}</text>
    <text class="ph-desc">{{ desc }}</text>
    <view class="ph-tips">
      <view v-for="t in tips" :key="t" class="ph-tip">
        <view class="ph-tip-dot"/>
        <text>{{ t }}</text>
      </view>
    </view>
    <text class="ph-foot">{{ footer }}</text>
  </view>
</template>

<script setup lang="ts">
import IconBox from '../IconBox/IconBox.vue';

withDefaults(defineProps<{
  icon?: string;
  color?: string;
  title: string;
  desc?: string;
  tips?: string[];
  footer?: string;
}>(), {
  icon: 'spoke',
  color: 'var(--c-accent)',
  desc: '本功能即将上线',
  tips: () => ['表单字段对齐 v1.1 接口契约', '状态机已接入（草稿 / 已提交 / 已完成）', '支持拍照上传凭证（接入 COS 预签）'],
  footer: '详情见 docs/ADMIN.md · docs/API.md',
});
</script>

<style scoped>
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}
.ph-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  position: relative;
}
.ph-icon::before {
  content: '';
  position: absolute;
  left: 22%;
  right: 22%;
  top: 0;
  height: 2px;
  background: var(--c-accent);
  border-radius: 1px;
}
.ph-title {
  font-family: var(--ff-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--c-ink);
  margin-bottom: 6px;
}
.ph-desc {
  font-size: 12px;
  color: var(--c-mute);
  margin-bottom: 18px;
}
.ph-tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  padding: 14px 16px;
  width: 100%;
  max-width: 320px;
  text-align: left;
}
.ph-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--c-ink);
  line-height: 1.4;
}
.ph-tip-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c-accent);
  flex-shrink: 0;
}
.ph-foot {
  margin-top: 18px;
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.04em;
}
</style>