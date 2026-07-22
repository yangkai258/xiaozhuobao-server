<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { BIZ } from '../../mock/data';
import IconBox from '../../components/IconBox/IconBox.vue';
import { useWorkbenchStore } from '../../stores';

const pathToIcon: Record<string, string> = {
  '/pages/meeting-new/index':   'meeting',
  '/pages/stocking-new/index':  'stock',
  '/pages/shipment-new/index':  'ship',
  '/pages/advert-new/index':    'ad',
  '/pages/store-new/index':     'store',
  '/pages/subsidy-new/index':   'subsidy',
  '/pages/rental-new/index':    'rental',
  '/pages/complaint-new/index': 'complaint',
};

const bizCounts: Record<string, { count: string; delta?: string }> = {
  '/pages/meeting-new/index':   { count: '4',  delta: '+2' },
  '/pages/stocking-new/index':  { count: '12', delta: '-3' },
  '/pages/shipment-new/index':  { count: '8',  delta: '+1' },
  '/pages/advert-new/index':    { count: '3' },
  '/pages/store-new/index':     { count: '6',  delta: '+1' },
  '/pages/subsidy-new/index':   { count: '2' },
  '/pages/rental-new/index':    { count: '5' },
  '/pages/complaint-new/index': { count: '1',  delta: '+1' },
};

const enrichedBiz = computed(() => BIZ.map(b => ({
  ...b,
  icon: pathToIcon[b.path] || 'spoke',
  count: bizCounts[b.path]?.count || '0',
  delta: bizCounts[b.path]?.delta || '',
})));

const builtPaths = new Set<string>([
  '/pages/shipment-new/index',
]);

function goBiz(b: any) {
  if (builtPaths.has(b.path)) {
    uni.navigateTo({ url: b.path });
  } else {
    uni.showToast({ title: b.name + ' · 即将上线', icon: 'none' });
  }
}

// KPI 3 列档案卡
const kpis = [
  { label: '本月 GMV', value: '482K', unit: '元', kind: 'ok', delta: '+12.4%' },
  { label: '待办',     value: '6',    unit: '项', kind: 'warn', delta: '今日新增' },
  { label: '业绩排名', value: '#3',   unit: '区', kind: 'mute', delta: '上海区' },
];

// 待办档案卡（按优先级/状态变色）
type Todo = { no: string; title: string; cust: string; amt: string; status: string; date: string; priority: 'high' | 'mid' | 'low'; icon: string };
const fallbackTodos: Todo[] = [
  { no: 'SO20260716-001', title: '客户紧急补货审批', cust: '上海建工建材', amt: '12,480.00', status: '待确认',  date: '07-14', priority: 'high', icon: 'ship' },
  { no: 'SO20260715-023', title: '特价审批 / 财务审核', cust: '深圳南方装饰', amt: '5,220.00',  status: '待处理',  date: '07-15', priority: 'mid',  icon: 'approval' },
  { no: 'SO20260712-008', title: '客户跟进 / 拜访',    cust: '东莞旗卷贸易', amt: '8,750.00',  status: '今日完成', date: '07-12', priority: 'low',  icon: 'follow' },
];

const workbenchStore = useWorkbenchStore();
onMounted(() => { void workbenchStore.load(); });
const todos = computed<Todo[]>(() => workbenchStore.todos.length ? workbenchStore.todos.map((t, index) => ({ no: 'todo-' + index, title: t.h, cust: t.sub, amt: '—', status: t.due, date: '', priority: 'mid', icon: 'follow' })) : fallbackTodos);

const PRIORITY = {
  high: { color: 'var(--c-accent)', label: '高优' },
  mid:  { color: 'var(--c-warn)',   label: '中优' },
  low:  { color: 'var(--c-ok)',     label: '一般' },
};
</script>

<template>
  <view class="page">
    <view class="notch">
      <text>09:41</text>
      <text><text class="dot" />ONLINE</text>
      <text>v3.1</text>
    </view>

    <!-- KPI 档案卡 -->
    <view class="kpi-card">
      <view v-for="(k, i) in kpis" :key="k.label" class="kpi-cell" :class="[k.kind, { first: i === 0 }]">
        <text class="kpi-label">{{ k.label }}</text>
        <view class="kpi-val-row">
          <text class="kpi-val" :class="k.kind">{{ k.value }}</text>
          <text class="kpi-unit">{{ k.unit }}</text>
        </view>
        <text class="kpi-delta" :class="k.kind">{{ k.delta }}</text>
      </view>
    </view>

    <!-- 业务铭牌 · 档案格 4×2 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">业务</text>
        <text class="section-meta">8 项 · 2 待办</text>
      </view>
      <view class="biz-grid">
        <view
          v-for="b in enrichedBiz"
          :key="b.path"
          class="biz-card"
          :style="{ '--biz-color': b.color }"
          @click="goBiz(b)"
        >
          <view class="biz-tab"/>
          <view class="biz-mark">
            <IconBox :name="b.icon" :size="18" :color="b.color"/>
          </view>
          <view class="biz-info">
            <text class="biz-name">{{ b.name }}</text>
            <text class="biz-en">{{ b.en }}</text>
          </view>
          <view class="biz-stat">
            <text class="biz-count">{{ b.count }}</text>
            <text v-if="b.delta" class="biz-delta">{{ b.delta }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 今日待办 · 档案卡 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">今日待办</text>
        <text class="section-meta">3 项</text>
      </view>
      <view class="todo-list">
        <view
          v-for="t in todos"
          :key="t.no"
          class="todo"
          :style="{ '--p-color': PRIORITY[t.priority].color }"
        >
          <view class="todo-tab"/>
          <view class="todo-body">
            <text class="todo-title">{{ t.title }}</text>
            <view class="todo-mid">
              <text class="todo-cust">{{ t.cust }}</text>
              <text class="todo-sep">·</text>
              <text class="todo-no">{{ t.no }}</text>
            </view>
            <view class="todo-foot">
              <text class="todo-amt">¥ {{ t.amt }}</text>
              <text class="todo-date">{{ t.date }}</text>
              <text class="todo-status">{{ t.status }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { background: var(--c-paper); padding-bottom: 90px; }

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
  min-width: 0;
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
.kpi-unit { font-size: 10px; color: var(--c-mute); margin-left: 2px; }
.kpi-delta {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  margin-top: 2px;
}
.kpi-delta.warn { color: var(--c-accent); font-weight: 600; }
.kpi-delta.ok { color: var(--c-ok); font-weight: 600; }

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
  letter-spacing: -0.005em;
}
.section-meta {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.08em;
}

/* ============ 业务铭牌 · 档案格 4×2 ============ */
.biz-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 0 16px;
}
.biz-card {
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  padding: 10px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  overflow: hidden;
  min-height: 88px;
  transition: transform 0.1s;
}
.biz-card:active { transform: scale(0.97); background: var(--c-paper); }
.biz-tab {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--biz-color, var(--c-ink));
}
.biz-mark {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
}
.biz-info { display: flex; flex-direction: column; gap: 1px; }
.biz-name {
  font-family: var(--ff-cn);
  font-size: 12px;
  font-weight: 600;
  color: var(--c-ink);
}
.biz-en {
  font-family: var(--ff-mono);
  font-size: 9px;
  color: var(--c-mute);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.biz-stat {
  position: absolute;
  right: 6px;
  top: 8px;
  text-align: right;
}
.biz-count {
  font-family: var(--ff-display);
  font-size: 13px;
  font-weight: 700;
  color: var(--c-ink);
  display: block;
  line-height: 1;
}
.biz-delta {
  font-family: var(--ff-mono);
  font-size: 9px;
  color: var(--c-mute);
  display: block;
  margin-top: 2px;
}

/* ============ 待办 · 档案卡 ============ */
.todo-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.todo {
  display: flex;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  position: relative;
  overflow: hidden;
  min-height: 80px;
}
.todo-tab {
  width: 4px;
  background: var(--p-color, var(--c-accent));
  flex-shrink: 0;
}
.todo-body {
  flex: 1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.todo-title {
  font-family: var(--ff-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.todo-mid {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--c-mute);
}
.todo-cust { color: var(--c-ink); font-weight: 500; }
.todo-sep { opacity: 0.5; }
.todo-no {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.04em;
}
.todo-foot {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 2px;
}
.todo-amt {
  font-family: var(--ff-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--c-steel);
  letter-spacing: 0.005em;
}
.todo-date {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
}
.todo-status {
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  color: var(--p-color, var(--c-ink));
  padding: 2px 6px;
  background: var(--c-paper);
  border-radius: var(--r-pill);
  position: relative;
}
.todo-status::before {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  top: 0;
  height: 2px;
  background: var(--p-color, var(--c-ink));
  border-radius: 1px;
}
</style>