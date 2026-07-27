<script setup lang="ts">
import type { ToolCall } from '../../types/chat';
const emit = defineEmits<{ (e: 'submit'): void }>();
defineProps<{ call: ToolCall }>();
</script>
<template>
  <view class="card">
    <text class="title">业务提交</text>
    <text class="body">确认后将调用 POST /biz/:kind</text>
    <view class="btn" @click="emit('submit')"><text>提交</text></view>
  </view>
</template>
<style lang="scss" scoped>
.card { padding: 10px; border: 1px solid var(--c-line-soft); border-radius: 8px; background: var(--c-paper); }
.title { font-weight: 600; font-size: 12px; color: var(--c-accent); }
.body { display: block; font-size: 13px; margin-top: 4px; }
.btn { margin-top: 8px; padding: 6px 12px; background: var(--c-accent); color: #fff; border-radius: 6px; align-self: flex-start; }
</style>