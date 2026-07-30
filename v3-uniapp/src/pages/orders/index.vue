<script setup lang="ts">
import FabAI from '../../components/FabAI/FabAI.vue';
import { ref, computed, onMounted } from 'vue';
import IconBox from '../../components/IconBox/IconBox.vue';
import { useInfoStore } from '../../stores';
import { addCents, formatCents } from '../../utils/amount';

const tab = ref<'orders' | 'aftersales'>('orders');
const infoStore = useInfoStore();
onMounted(() => { void infoStore.load(); });

// 状态映射：mark 图标 + 颜色
const STATUS_STYLE: Record<string, { icon: string; color: string; label: string }> = {
  '已发货': { icon: 'ship',      color: 'var(--c-ok)',     label: '已发货' },
  '待确认': { icon: 'approval',  color: 'var(--c-warn)',   label: '待确认' },
  '已确认': { icon: 'tag',       color: 'var(--c-blue)',   label: '已确认' },
  '已完成': { icon: 'tag',       color: 'var(--c-steel)',  label: '已完成' },
  '已取消': { icon: 'complaint', color: 'var(--c-danger)', label: '已取消' },
  '待 OA 审批': { icon: 'clock',    color: 'var(--c-warn)',   label: '待 OA 审批' },
  'SAP 已建单': { icon: 'ship',     color: 'var(--c-blue)',   label: 'SAP 已建单' },
  '处理中':   { icon: 'approval', color: 'var(--c-warn)',   label: '处理中' },
  '已关闭':   { icon: 'tag',      color: 'var(--c-steel)',  label: '已关闭' },
  '已驳回':   { icon: 'complaint',color: 'var(--c-danger)', label: '已驳回' },
};

function styleOf(status: string) {
  return STATUS_STYLE[status] ?? { icon: 'tag', color: 'var(--c-steel)', label: status };
}

// KPI 精简到 3 个
const orderKpi = computed(() => {
  const total = addCents(...infoStore.orders.map((order) => order.amtCents));
  const pending = infoStore.orders.filter((order) => !['已完成', '已取消'].includes(order.status)).length;
  return [
    { label: '本月 GMV', value: formatCents(total), sub: '元', kind: 'ok' },
    { label: '待处理', value: String(pending), sub: '单', kind: 'warn' },
    { label: '订单总数', value: String(infoStore.orders.length), sub: '单', kind: 'mute' },
  ];
});

function onPick(o: any) {
  if (tab.value === 'aftersales') {
    uni.navigateTo({ url: '/pages/aftersale-detail/index?no=' + encodeURIComponent(o.no) });
  } else {
    uni.navigateTo({ url: '/pages/order-detail/index?no=' + encodeURIComponent(o.no) });
  }
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
      <text class="title">订单</text>
      <view class="nav-action">
        <IconBox name="search" :size="14" color="var(--c-mute)"/>
      </view>
    </view>

    <!-- KPI · 3 列档案卡 -->
    <view class="kpi-card">
      <view v-for="(k, i) in orderKpi" :key="k.label" class="kpi-cell" :class="[k.kind, { first: i === 0 }]">
        <text class="kpi-label">{{ k.label }}</text>
        <view class="kpi-val-row">
          <text class="kpi-val" :class="k.kind">{{ k.value }}</text>
          <text class="kpi-unit">{{ k.sub }}</text>
        </view>
      </view>
    </view>

    <!-- tab · 统一描边风格 -->
    <view class="hub-switch">
      <view
        :class="{ active: tab === 'orders' }"
        class="tab-btn"
        @click="tab = 'orders'"
      >
        <text>销售订单</text>
        <text class="num">{{ infoStore.orders.length }}</text>
      </view>
      <view
        :class="{ active: tab === 'aftersales' }"
        class="tab-btn"
        @click="tab = 'aftersales'"
      >
        <text>销退售后</text>
        <text class="num">{{ infoStore.aftersales.length }}</text>
      </view>
    </view>

    <!-- 订单档案卡 -->
    <view v-if="tab === 'orders'" class="card-list">
      <view
        v-for="o in infoStore.orders"
        :key="o.no"
        class="dossier"
        :style="{ '--mark-color': styleOf(o.status).color }"
        @click="onPick(o)"
      >
        <view class="dossier-tab"/>
        <view class="dossier-body">
          <view class="dossier-top">
            <text class="dossier-cust">{{ o.cust }}</text>
            <view class="dossier-status" :style="{ '--status-color': styleOf(o.status).color }">
              <view class="status-dot"/>
              <text>{{ styleOf(o.status).label }}</text>
            </view>
          </view>
          <view class="dossier-mid">
            <text class="dossier-no">{{ o.no }}</text>
            <text class="dossier-sep">·</text>
            <text class="dossier-date">{{ o.date }}</text>
            <text class="dossier-qty">{{ o.qty }}</text>
          </view>
          <view class="dossier-foot">
            <text class="dossier-amt">¥ {{ o.amt }}</text>
            <view class="dossier-arrow"><IconBox name="chevron" :size="14" color="var(--c-mute)"/></view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="card-list">
      <view
        v-for="a in infoStore.aftersales"
        :key="a.no"
        class="dossier"
        :style="{ '--mark-color': styleOf(a.status).color }"
        @click="onPick(a)"
      >
        <view class="dossier-tab"/>
        <view class="dossier-body">
          <view class="dossier-top">
            <text class="dossier-cust">{{ a.material }}</text>
            <view class="dossier-status" :style="{ '--status-color': styleOf(a.status).color }">
              <view class="status-dot"/>
              <text>{{ styleOf(a.status).label }}</text>
            </view>
          </view>
          <view class="dossier-mid">
            <text class="dossier-no">{{ a.no }}</text>
            <text class="dossier-sep">·</text>
            <text class="dossier-date">{{ a.date }}</text>
          </view>
          <view class="dossier-foot">
            <view class="dossier-reason">
              <text class="reason-label">原因</text>
              <text class="reason-text">{{ a.reason }}</text>
            </view>
            <view class="dossier-arrow"><IconBox name="chevron" :size="14" color="var(--c-mute)"/></view>
          </view>
        </view>
      </view>
    </view>
    <FabAI />
  </view>
</template>

<style scoped>
.page { background: var(--c-paper); padding-bottom: 90px; }

/* titlebar */
.titlebar .nav-action {
  position: absolute; right: 12px;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--r-pill); background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
}

/* ============ KPI · 档案小卡 ============ */
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
.kpi-val.warn { color: var(--c-accent); }
.kpi-val.ok { color: var(--c-ok); }
.kpi-val.mute { color: var(--c-ink); }
.kpi-unit {
  font-size: 10px;
  color: var(--c-mute);
  margin-left: 2px;
}

/* ============ tab · 统一描边 ============ */
.hub-switch {
  display: flex;
  padding: 14px 16px 0;
  gap: 8px;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-ink);
  background: transparent;
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  transition: all 0.15s;
}
.tab-btn.active {
  background: var(--c-accent-soft);
  border-color: var(--c-accent);
  color: var(--c-accent);
}
.tab-btn .num {
  font-family: var(--ff-mono);
  font-size: 10px;
  padding: 1px 6px;
  background: var(--c-paper);
  border-radius: var(--r-pill);
  color: var(--c-mute);
}
.tab-btn.active .num {
  background: var(--c-accent);
  color: #fff;
}

/* ============ 档案卡 · 核心 ============ */
.card-list {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dossier {
  display: flex;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  position: relative;
  overflow: hidden;
  min-height: 96px;
  transition: transform 0.1s;
}
.dossier:active {
  transform: scale(0.99);
  background: var(--c-paper);
}
.dossier-tab {
  width: 4px;
  background: var(--mark-color, var(--c-accent));
  flex-shrink: 0;
}
.dossier-body {
  flex: 1;
  padding: 12px 12px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.dossier-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.dossier-cust {
  font-family: var(--ff-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--c-ink);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.005em;
}
.dossier-status {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 6px;
  background: var(--c-paper);
  border-radius: var(--r-pill);
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--status-color, var(--c-ink));
  position: relative;
}
.dossier-status::before {
  content: '';
  position: absolute;
  left: 6px;
  right: 6px;
  top: 0;
  height: 2px;
  background: var(--status-color, var(--c-ink));
  border-radius: 1px;
}
.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--status-color, var(--c-ink));
  margin-left: 2px;
}
.dossier-mid {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.04em;
}
.dossier-sep { opacity: 0.5; }
.dossier-qty {
  margin-left: auto;
  font-family: var(--ff-cn);
  font-size: 10px;
  color: var(--c-mute);
}
.dossier-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
}
.dossier-amt {
  font-family: var(--ff-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--c-steel);
  letter-spacing: 0.005em;
}
.dossier-arrow {
  display: flex;
  align-items: center;
  opacity: 0.5;
}
.dossier-reason {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.reason-label {
  font-size: 10px;
  color: var(--c-mute);
  padding: 1px 6px;
  background: var(--c-paper);
  border-radius: var(--r-pill);
  flex-shrink: 0;
}
.reason-text {
  font-size: 11px;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>