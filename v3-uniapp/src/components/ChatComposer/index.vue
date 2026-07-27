<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps<{ sending: boolean }>();
const emit = defineEmits<{ (e: 'send', payload: { prompt: string; attachments?: any[] }): void }>();
const text = ref('');
const attachments = ref<Array<{ fileId: string; kind: 'image' | 'file' }>>([]);
function onSubmit() {
  if (!text.value.trim() || props.sending) return;
  emit('send', { prompt: text.value, attachments: attachments.value });
  text.value = '';
  attachments.value = [];
}
function mockAttach() {
  // ponytail: phase one stub — real picker wires to /storage/upload-ai in phase two.
  attachments.value.push({ fileId: 'mock-' + Date.now().toString(36), kind: 'image' });
}
</script>
<template>
  <view class="composer">
    <view class="row">
      <view class="btn" @click="mockAttach"><text>📎</text></view>
      <input v-model="text" class="input" placeholder="输入消息…" :disabled="sending" />
      <view class="send-btn" @click="onSubmit"><text>{{ sending ? '…' : '发送' }}</text></view>
    </view>
    <view v-if="attachments.length" class="atts">
      <text>{{ attachments.length }} 个附件</text>
    </view>
  </view>
</template>
<style lang="scss" scoped>
.composer { padding: 10px 12px; border-top: 1px solid var(--c-line-soft); background: var(--c-paper); }
.row { display: flex; align-items: center; gap: 8px; }
.btn { width: 32px; height: 32px; border: 1px solid var(--c-line-soft); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.input { flex: 1; height: 32px; padding: 0 10px; border: 1px solid var(--c-line-soft); border-radius: 6px; font-size: 14px; }
.send-btn { padding: 6px 14px; background: var(--c-accent); color: #fff; border-radius: 6px; font-size: 13px; font-weight: 600; }
.atts { padding: 4px 0; font-size: 11px; color: var(--c-mute); }
</style>