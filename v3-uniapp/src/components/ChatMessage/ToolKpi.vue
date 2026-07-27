<script setup lang="ts">
import type { ToolCall } from '../../types/chat';
defineProps<{ call: ToolCall }>();
</script>
<template>
  <view class="card">
    <text class="title">数据查询</text>
    <view v-for="(kpi, i) in ((call.preview as any)?.kpis || [])" :key="i" class="row">
      <text class="lbl">{{ kpi.label }}</text>
      <text class="val">{{ kpi.value }}</text>
    </view>
  </view>
</template>
<style lang="scss" scoped>
.card { padding: 10px; border: 1px solid var(--c-line-soft); border-radius: 8px; background: var(--c-paper); }
.title { font-weight: 600; font-size: 12px; color: var(--c-accent); }
.row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.lbl { color: var(--c-mute); }
.val { font-weight: 600; }
</style>