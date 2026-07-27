<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api_feature, api_ai } from '../../api/client';
import { useChat } from '../../composables/useChat';
import ChatBubble from '../../components/ChatMessage/ChatBubble.vue';
import ChatComposer from '../../components/ChatComposer/index.vue';
import SceneGrid from '../../components/SceneGrid/index.vue';
import SessionDrawer from '../../components/SessionDrawer/index.vue';

// ponytail: phase one feature flag check decides whether to render the chat shell or fall back to the original 6-module grid.
const aiHome = ref<boolean | null>(null);
const fallback = ref(false);
const { messages, isSending, send } = useChat();
const drawerOpen = ref(false);

onMounted(async () => {
  // ponytail: page_view event — phase one goes to console; phase two ships to a real sink.
  console.log('[event] page_view', { page: '/pages/ai' });
  try {
    const r = await api_feature.get();
    aiHome.value = !!r.data.AI_HOME;
    fallback.value = !aiHome.value;
  } catch {
    fallback.value = true;
    aiHome.value = false;
  }
  try {
    const mods = await api_ai.modules();
    fallbackModules.value = mods.data || [];
  } catch { fallbackModules.value = []; }
});

const fallbackModules = ref<Array<{ id: string; num: string; name: string; desc: string; color: string }>>([]);

function pickScene(prompt: string) {
  void send({ prompt });
}

function onSend(payload: { prompt: string; attachments?: any[] }) {
  void send(payload);
}
</script>

<template>
  <view class="page">
    <view class="notch"><text>09:41</text><text><text class="dot" />ONLINE</text><text>v3.1</text></view>
    <view class="titlebar">
      <view class="back"><text @click="drawerOpen = true">≡</text></view>
      <text class="title">AI 对话首页</text>
      <text class="meta">{{ messages.length }} 条</text>
    </view>

    <!-- ponytail: when FEATURE_AI_HOME is false, fall back to the legacy 6-module grid so older builds keep working. -->
    <view v-if="fallback" class="fallback">
      <view class="fallback-head">
        <text>AI 工作台（阶段一未开启）</text>
      </view>
      <view class="fallback-grid">
        <view v-for="m in fallbackModules" :key="m.id" class="fallback-card" :style="{ '--c': m.color }">
          <text class="num">{{ m.num }}</text>
          <text class="name">{{ m.name }}</text>
          <text class="desc">{{ m.desc }}</text>
        </view>
      </view>
    </view>

    <view v-else class="ai-home">
      <SceneGrid @pick="pickScene" />
      <scroll-view class="messages" scroll-y>
        <view v-for="m in messages" :key="m.id" class="msg-wrap">
          <ChatBubble :message="m" />
        </view>
        <view v-if="messages.length === 0" class="empty">
          <text>请选择一个场景，或在下方输入你的问题。</text>
        </view>
      </scroll-view>
      <ChatComposer :sending="isSending" @send="onSend" />
    </view>

    <SessionDrawer :open="drawerOpen" @close="drawerOpen = false" />
  </view>
</template>

<style lang="scss" scoped>
.page { background: var(--c-paper); min-height: 100vh; }
.notch { display: flex; justify-content: space-between; padding: 8px 14px; font-family: var(--ff-mono); font-size: 11px; }
.titlebar { display: flex; align-items: center; padding: 4px 12px; border-bottom: 1px solid var(--c-line-soft); }
.title { flex: 1; text-align: center; font-weight: 600; }
.meta { font-family: var(--ff-mono); font-size: 11px; color: var(--c-mute); }
.back text { font-size: 20px; padding: 0 8px; }
.ai-home { display: flex; flex-direction: column; min-height: calc(100vh - 60px); }
.messages { flex: 1; padding: 12px; min-height: 50vh; }
.msg-wrap { margin-bottom: 12px; }
.empty { padding: 60px 20px; text-align: center; color: var(--c-mute); font-size: 13px; }
.fallback { padding: 12px; }
.fallback-head { padding: 8px 4px 12px; font-weight: 600; color: var(--c-mute); }
.fallback-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fallback-card { padding: 14px; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); border-left: 3px solid var(--c); }
.fallback-card .num { font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); }
.fallback-card .name { display: block; font-weight: 600; margin-top: 4px; }
.fallback-card .desc { display: block; font-size: 11px; color: var(--c-mute); margin-top: 2px; }
</style>
