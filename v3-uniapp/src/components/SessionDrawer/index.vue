<script setup lang="ts">
import { useChatStore } from '../../stores/chat';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'pick', id: string): void }>();
const chat = useChatStore();

function onPick(id: string) { chat.selectSession(id); emit('pick', id); emit('close'); }
function onNew() { chat.newSession(); emit('close'); }
function onRemove(id: string, e: any) { e?.stopPropagation?.(); chat.removeSession(id); }
function fmt(at: string) { const d = new Date(at); return d.getMonth() + 1 + '/' + d.getDate() + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'); }
</script>
<template>
  <view v-if="open" class="mask" @click="emit('close')">
    <view class="drawer" @click.stop>
      <view class="head">
        <text class="title">会话列表</text>
        <view class="add" @click="onNew"><text>新建会话</text></view>
      </view>
      <scroll-view class="list" scroll-y>
        <view v-if="!chat.sessions.length" class="empty">
          <text>还没有会话，点右上“新建会话”开始</text>
        </view>
        <view
          v-for="s in chat.sessions"
          :key="s.id"
          class="item"
          :class="{ active: s.id === chat.activeId }"
          @click="onPick(s.id)"
        >
          <view class="row">
            <text class="name">{{ s.title }}</text>
            <text class="del" @click="onRemove(s.id, $event)">删</text>
          </view>
          <text class="meta">{{ s.module }} · {{ s.messages.length }} 条 · {{ fmt(s.updatedAt) }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>
<style lang="scss" scoped>
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; }
.drawer { position: fixed; left: 0; top: 0; bottom: 0; width: 76vw; background: var(--c-paper); display: flex; flex-direction: column; }
.head { display: flex; align-items: center; padding: 16px; border-bottom: 1px solid var(--c-line-soft); }
.title { flex: 1; font-weight: 600; font-size: 16px; }
.add { padding: 6px 12px; background: var(--c-accent); color: #fff; border-radius: 6px; font-size: 12px; }
.list { flex: 1; padding: 8px; }
.item { padding: 10px 12px; border-radius: 8px; }
.item.active { background: var(--c-paper-2); border: 1px solid var(--c-accent); }
.row { display: flex; align-items: center; }
.name { flex: 1; font-size: 14px; font-weight: 500; }
.del { color: var(--c-mute); font-size: 12px; padding: 2px 6px; }
.meta { display: block; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); margin-top: 2px; }
.empty { padding: 40px 20px; text-align: center; color: var(--c-mute); font-size: 12px; }
</style>
