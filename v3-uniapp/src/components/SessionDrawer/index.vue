<script setup lang="ts">
defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();
</script>
<template>
  <view v-if="open" class="mask" @click="emit('close')">
    <view class="drawer" @click.stop>
      <text class="title">会话列表</text>
      <text class="empty">（阶段一本地内存，刷新即清空）</text>
    </view>
  </view>
</template>
<style lang="scss" scoped>
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; }
.drawer { position: fixed; left: 0; top: 0; bottom: 0; width: 70vw; background: var(--c-paper); padding: 16px; }
.title { font-weight: 600; font-size: 16px; display: block; margin-bottom: 12px; }
.empty { font-size: 12px; color: var(--c-mute); }
</style>