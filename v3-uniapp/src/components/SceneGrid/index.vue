<script setup lang="ts">
const scenes = [
  { id: 'recog', icon: '📷', title: '拍照识客', desc: '上传名片/现场照' },
  { id: 'data', icon: '📊', title: '数据查询', desc: '本月订单/GMV' },
  { id: 'kb', icon: '📚', title: '知识问答', desc: 'K11 / JS 规格' },
  { id: 'draft', icon: '✏️', title: '草稿生成', desc: '订单 / 备忘' },
];
const emit = defineEmits<{ (e: 'pick', prompt: string): void }>();
function onPick(s: typeof scenes[number]) {
  const map: Record<string, string> = {
    recog: '请帮我识别这张名片上的客户资质',
    data: '请查询本月订单数据',
    kb: 'K11 防水涂料的施工步骤是什么？',
    draft: '帮我写一份订单草稿',
  };
  emit('pick', map[s.id] || s.title);
}
</script>
<template>
  <view class="grid">
    <view v-for="s in scenes" :key="s.id" class="card" @click="onPick(s)">
      <text class="icon">{{ s.icon }}</text>
      <text class="title">{{ s.title }}</text>
      <text class="desc">{{ s.desc }}</text>
    </view>
  </view>
</template>
<style lang="scss" scoped>
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; }
.card { padding: 14px; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); display: flex; flex-direction: column; gap: 4px; }
.icon { font-size: 20px; }
.title { font-weight: 600; font-size: 13px; }
.desc { font-size: 11px; color: var(--c-mute); }
</style>