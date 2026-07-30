<script setup lang="ts">
import { ref } from 'vue';
import { api_ai } from '../../api/client';
import { useChatStore } from '../../stores/chat';

const chat = useChatStore();
const question = ref('');
const sending = ref(false);
interface Citation { docId: string; title: string; snippet: string; href?: string; }
const answer = ref('');
const citations = ref<Citation[]>([]);

async function ask() {
  if (!question.value.trim() || sending.value) return;
  sending.value = true;
  try {
    chat.newSession(['kb_query'], 'kb');
    await chat.send({ prompt: question.value, module: 'kb' });
    const last = chat.activeSession?.messages.at(-1);
    answer.value = last?.contents.find((c) => c.kind === 'text')?.kind === 'text' ? (last!.contents as any).find((c: any) => c.kind === 'text').text : '';
    citations.value = (last?.citations || []) as Citation[];
  } finally { sending.value = false; }
}
</script>

<template>
  <view class="page">
    <view class="notch"><text>09:41</text><text><text class="dot" />ONLINE</text><text>v3.1</text></view>
    <view class="titlebar"><text class="title">知识库问答</text></view>
    <view class="card">
      <textarea v-model="question" class="ta" placeholder="输入你的工程、产品或类别问题" />
      <view class="btn" :class="{ disabled: sending }" @click="ask"><text>{{ sending ? '查询中...' : '发送问一问' }}</text></view>
    </view>
    <view v-if="answer" class="card">
      <text class="title">答案</text>
      <text class="body">{{ answer }}</text>
      <view v-if="citations.length" class="cites">
        <text class="title">引用</text>
        <view v-for="c in citations" :key="c.docId" class="cite">
          <text class="cite-title">{{ c.title }}</text>
          <text class="cite-snippet">{{ c.snippet }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page { background: var(--c-paper); min-height: 100vh; padding-bottom: 40px; }
.titlebar { display: flex; align-items: center; padding: 4px 12px; border-bottom: 1px solid var(--c-line-soft); }
.titlebar .title { flex: 1; text-align: center; font-weight: 600; }
.card { margin: 12px 16px; padding: 14px; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); display: flex; flex-direction: column; gap: 8px; }
.ta { width: 100%; min-height: 80px; border: 1px solid var(--c-line-soft); border-radius: 8px; padding: 10px; font-size: 14px; box-sizing: border-box; }
.btn { padding: 10px 0; background: var(--c-accent); color: #fff; text-align: center; border-radius: 8px; font-weight: 600; }
.btn.disabled { opacity: 0.6; pointer-events: none; }
.title { font-size: 12px; color: var(--c-mute); font-weight: 600; }
.body { font-size: 14px; line-height: 1.6; }
.cites { display: flex; flex-direction: column; gap: 6px; }
.cite { padding: 8px 10px; border-left: 2px solid var(--c-accent); background: var(--c-paper); border-radius: 4px; }
.cite-title { display: block; font-weight: 600; font-size: 13px; }
.cite-snippet { display: block; font-size: 12px; color: var(--c-mute); margin-top: 2px; }
</style>
