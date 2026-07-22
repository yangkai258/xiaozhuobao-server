<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api_ai } from '../../api/client';

const aiIcons: Record<string, string> = {
  '1': 'spoke', '2': 'tag', '3': 'clock', '4': 'complaint', '5': 'phone', '6': 'follow',
};

const modules = ref<Array<{ id: string; num: string; name: string; desc: string; color: string }>>([]);
onMounted(async () => {
  try {
    const r = await api_ai.modules();
    modules.value = r.data;
  } catch {
    // AI modules not yet reachable; keep empty list so the UI renders 6 placeholder cards
  }
});

const dynamic = [
  { tag: '洞察', color: 'var(--c-blue)',  text: '上海建工近 7 日下单频率 +18%，建议派单跟进',       ts: '07-21 09:21' },
  { tag: '预警', color: 'var(--c-warn)',  text: 'JS 聚合物库存跌至 5 桶，建议本日补货',           ts: '07-21 08:54' },
  { tag: '报价', color: 'var(--c-green)', text: 'RFP #2026-014：建议毛利价 ¥244/桶（参考 SAP）',  ts: '07-21 08:30' },
  { tag: '售后', color: 'var(--c-accent)',text: '本月销退原因：发错货占 47%，建议复核发货工单',    ts: '07-20 17:08' },
  { tag: '知识', color: 'var(--c-gold)',  text: 'K11 在 4 类基层的施工步骤（含视频索引）已更新',   ts: '07-20 14:22' },
  { tag: '跟进', color: 'var(--c-steel)', text: '广州雄驰客户 14 天未跟进，建议拜访',             ts: '07-15 09:00' },
];

// KPI 精简
const kpis = [
  { label: '调用次数', value: '38',  sub: '本周' },
  { label: '采纳建议', value: '12',  sub: '本周' },
  { label: '采纳率',   value: '31%', sub: '本周' },
];

function onPick(m: any) {
  uni.showToast({ title: m.name + ' · AI 调用中', icon: 'none' });
}
</script>

<template>
  <view class="page">
    <view class="notch">
      <text>09:41</text>
      <text><text class="dot" />ONLINE</text>
      <text>v3.1</text>
    </view>

    <view class="titlebar">
      <text class="title">AI 工作台</text>
      <view class="nav-action">
        <text>7 日</text>
      </view>
    </view>

    <!-- KPI 档案卡 -->
    <view class="kpi-card">
      <view v-for="(k, i) in kpis" :key="k.label" class="kpi-cell" :class="{ first: i === 0 }">
        <text class="kpi-label">{{ k.label }}</text>
        <view class="kpi-val-row">
          <text class="kpi-val">{{ k.value }}</text>
        </view>
        <text class="kpi-sub">{{ k.sub }}</text>
      </view>
    </view>

    <!-- 6 模块 2×3 档案格 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">AI 模块</text>
        <text class="section-meta">{{ modules.length }} 个 · 可调用</text>
      </view>
      <view class="ai-grid">
        <view
          v-for="m in modules"
          :key="m.id"
          class="ai-card"
          :style="{ '--ai-color': m.color }"
          @click="onPick(m)"
        >
          <view class="ai-tab"/>
          <view class="ai-body">
            <view class="ai-top">
              <text class="ai-name">{{ m.name }}</text>
              <text class="ai-num">{{ m.num }}</text>
            </view>
            <text class="ai-desc">{{ m.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 近 7 日动态 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">近 7 日动态</text>
        <text class="section-meta">{{ dynamic.length }} 条</text>
      </view>
      <view class="dyn-list">
        <view
          v-for="(d, i) in dynamic"
          :key="i"
          class="dyn"
          :style="{ '--tag-color': d.color }"
        >
          <view class="dyn-tag" :style="{ '--tag-color': d.color }">
            <text>{{ d.tag }}</text>
          </view>
          <view class="dyn-body">
            <text class="dyn-text">{{ d.text }}</text>
            <view class="dyn-meta">
              <text class="dyn-ts">{{ d.ts }}</text>
              <view class="dyn-arrow"></view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { background: var(--c-paper); padding-bottom: 90px; }

.titlebar .nav-action {
  position: absolute; right: 12px;
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: var(--r-pill);
  background: var(--c-paper-2); border: 1px solid var(--c-line-soft);
  font-family: var(--ff-body); font-size: 12px; font-weight: 600; color: var(--c-ink);
}

/* ============ KPI 档案卡 ============ */
.kpi-card {
  display: flex;
  margin: 10px 16px 0;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  padding: 14px 8px;
  position: relative;
  overflow: hidden;
}
.kpi-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--c-accent);
}
.kpi-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
  border-right: 1px dashed var(--c-line-soft);
}
.kpi-cell:last-child { border-right: none; }
.kpi-cell.first { padding-left: 12px; }
.kpi-label {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.kpi-val-row { display: flex; align-items: baseline; gap: 2px; }
.kpi-val {
  font-family: var(--ff-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1;
  color: var(--c-ink);
}
.kpi-sub { font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); }

/* ============ section ============ */
.section { padding: 16px 0 0; }
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0 16px 10px;
}
.section-title {
  font-family: var(--ff-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--c-ink);
}
.section-meta {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.08em;
}

/* ============ AI 模块 2×3 ============ */
.ai-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 16px;
}
.ai-card {
  display: flex;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  position: relative;
  overflow: hidden;
  min-height: 76px;
  transition: transform 0.1s;
}
.ai-card:active { transform: scale(0.99); background: var(--c-paper); }
.ai-tab {
  width: 4px;
  background: var(--ai-color, var(--c-ink));
  flex-shrink: 0;
}
.ai-body {
  flex: 1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ai-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 4px;
}
.ai-name {
  font-family: var(--ff-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--c-ink);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-num {
  font-family: var(--ff-display);
  font-size: 12px;
  font-weight: 700;
  color: var(--c-ink);
  opacity: 0.35;
  flex-shrink: 0;
}
.ai-desc {
  font-size: 11px;
  color: var(--c-mute);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============ 近 7 日动态 ============ */
.dyn-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dyn {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  align-items: stretch;
  position: relative;
  overflow: hidden;
}
.dyn::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--tag-color, var(--c-ink));
  border-radius: 1px;
}
.dyn-tag {
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--tag-color, var(--c-ink));
  background: var(--c-paper);
  padding: 2px 8px;
  border-radius: var(--r-pill);
  flex-shrink: 0;
  align-self: flex-start;
  position: relative;
}
.dyn-tag::before {
  content: '';
  position: absolute;
  left: 6px;
  right: 6px;
  top: 0;
  height: 2px;
  background: var(--tag-color, var(--c-ink));
  border-radius: 1px;
}
.dyn-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.dyn-text {
  font-size: 12px;
  color: var(--c-ink);
  line-height: 1.5;
  display: block;
}
.dyn-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dyn-ts {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.04em;
}
.dyn-arrow {
  display: flex;
  align-items: center;
  opacity: 0.5;
}
</style>