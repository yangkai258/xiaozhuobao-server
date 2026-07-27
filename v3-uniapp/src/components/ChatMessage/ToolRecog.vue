<script setup lang="ts">
import type { ToolCall } from '../../types/chat';
defineProps<{ call: ToolCall }>();
</script>
<template>
  <view class="card">
    <text class="title">客户识别</text>
    <text class="body">{{ (call.preview as any)?.customerName || '—' }} · 置信度 {{ ((call.preview as any)?.confidence ?? 0) * 100 | 0 }}%</text>
  </view>
</template>
<style lang="scss" scoped>
.card { padding: 10px; border: 1px solid var(--c-line-soft); border-radius: 8px; background: var(--c-paper); }
.title { font-weight: 600; font-size: 12px; color: var(--c-accent); }
.body { display: block; font-size: 13px; margin-top: 4px; }
</style>