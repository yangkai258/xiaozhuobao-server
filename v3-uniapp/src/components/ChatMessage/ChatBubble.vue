<script setup lang="ts">
import type { ChatMessage, ToolCall } from '../../types/chat';
import ToolRecog from './ToolRecog.vue';
import ToolDraft from './ToolDraft.vue';
import ToolKpi from './ToolKpi.vue';
import ToolList from './ToolList.vue';
import ToolKb from './ToolKb.vue';
import ToolBizSubmit from './ToolBizSubmit.vue';

function hasKpis(call: ToolCall): boolean {
  return Array.isArray((call.preview as { kpis?: unknown[] } | undefined)?.kpis);
}
defineProps<{ message: ChatMessage }>();
</script>

<template>
  <view class="bubble" :class="message.role">
    <view v-for="(c, i) in message.contents" :key="i" class="content">
      <text v-if="c.kind === 'text'">{{ c.text }}</text>
      <text v-else-if="c.kind === 'image'">[图片]</text>
      <text v-else-if="c.kind === 'file'">[文件] {{ c.name }}</text>
    </view>
    <view v-for="call in (message.toolCalls || [])" :key="call.id" class="tool">
      <ToolRecog v-if="call.type === 'customer_qualification'" :call="call" />
      <ToolKpi v-else-if="call.type === 'data_query' && hasKpis(call)" :call="call" />
      <ToolList v-else-if="call.type === 'data_query'" :call="call" />
      <ToolKb v-else-if="call.type === 'kb_reply'" :call="call" />
      <ToolDraft v-else-if="call.type === 'draft'" :call="call" />
      <ToolBizSubmit v-else-if="call.type === 'submit'" :call="call" />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.bubble { padding: 10px 12px; margin: 4px 0; border-radius: 12px; max-width: 80%; }
.bubble.user { background: var(--c-accent-soft, #fde8d8); margin-left: auto; }
.bubble.assistant { background: var(--c-paper-2); border: 1px solid var(--c-line-soft); }
.content { font-size: 14px; line-height: 1.6; color: var(--c-ink); white-space: pre-wrap; }
.tool { margin-top: 8px; }
</style>