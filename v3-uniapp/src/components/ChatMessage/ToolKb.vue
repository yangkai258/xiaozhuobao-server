<script setup lang="ts">
import type { ToolCall, Citation } from '../../types/chat';
defineProps<{ call: ToolCall }>();
</script>
<template>
  <view class="card">
    <text class="title">知识库</text>
    <text class="body">{{ (call.preview as any)?.snippet || '—' }}</text>
  </view>
</template>
<style lang="scss" scoped>
.card { padding: 10px; border: 1px solid var(--c-line-soft); border-radius: 8px; background: var(--c-paper); }
.title { font-weight: 600; font-size: 12px; color: var(--c-accent); }
.body { display: block; font-size: 13px; margin-top: 4px; }
</style>