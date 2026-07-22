<script setup lang="ts">
import { ref, computed } from 'vue';
import { ORDERS } from '../../mock/data';
import { ORDER_TRANSITIONS, ORDER_TRANSITION_ROLES, type OrderStatus } from '../../utils/state';
import { formatCents, addCents } from '../../utils/amount';
import IconBox from '../../components/IconBox/IconBox.vue';
import StatusTag from '../../components/StatusTag/StatusTag.vue';

const order = ref({ ...ORDERS[0] });

const detail = {
  no: order.value.no,
  status: order.value.status,
  cust: order.value.cust,
  date: order.value.date,
  qty: order.value.qty,
  amtCents: '1248000',
  shipCents: '85000',
  taxCents: '149800',
  totalCents: '1482600',
  lines: [
    { name: 'JS 聚合物防水涂料 18kg', spec: '聚合物 · 18kg/桶', qty: '8', unit: '桶', price: '33800', cents: '270400' },
    { name: 'K11 通用型防水涂料 20kg', spec: '通用型 · 20kg/桶', qty: '5', unit: '桶', price: '24480', cents: '122400' },
    { name: '高柔性防水卷材 1.5mm',  spec: '1.5mm 厚',         qty: '120', unit: '卷', price: '8800',  cents: '1056000' },
  ],
  address: '上海浦东新区张江高科园区蔡伦路 88 号 · 张工 15938000123',
  carrier: '宅宝快运 · 单号 ZBKT20260716-0081',
  timeline: [
    { ts: '07-16 14:22', who: '张明',   text: '提交订单', status: 'DRAFT->SUBMITTED' },
    { ts: '07-16 15:10', who: '财务',   text: '已收款',   status: 'ok' },
    { ts: '07-16 16:30', who: '仓管',   text: '已拣货',   status: 'ok' },
    { ts: '07-16 18:00', who: '快运',   text: '已发出',   status: 'SHIPPED' },
    { ts: '07-17 09:41', who: '签收',   text: '客户已收', status: 'current' },
  ],
};

const status = ref<OrderStatus>('SHIPPED');
const role = ref<'SALES' | 'FINANCE' | 'REGION_MGR' | 'ADMIN' | 'CS'>('SALES');

const next = computed(() => ORDER_TRANSITIONS[status.value] ?? []);
const nextActions = computed(() =>
  next.value.map(to => ({
    to,
    key: status.value + '->' + to,
    allowed: (ORDER_TRANSITION_ROLES[status.value + '->' + to] ?? []).includes(role.value),
    label: ({
      'SHIPPED->COMPLETED': '确认签收',
      'CONFIRMED->SHIPPED': '发货',
      'CONFIRMED->CANCELED': '取消订单',
      'SUBMITTED->CONFIRMED': '收款确认',
      'SUBMITTED->CANCELED': '撤回',
      'DRAFT->SUBMITTED': '提交',
    } as Record<string, string>)[status.value + '->' + to] || (status.value + '->' + to),
    accent: !to.endsWith('CANCELED'),
    danger: to.endsWith('CANCELED') || to === 'REJECTED',
  })),
);

function onAction(act) {
  if (!act.allowed) { uni.showToast({ title: '当前角色无此操作权限', icon: 'none' }); return; }
  uni.showModal({
    title: '确认' + act.label,
    content: '状态将从 ' + status.value + ' 变更为 ' + act.to,
    success: function(res) { if (res.confirm) { status.value = act.to; uni.showToast({ title: '状态已更新', icon: 'success' }); } },
  });
}

const subtotal = computed(() => addCents(...detail.lines.map(l => l.cents)));
</script>

<template>
  <view class="page">
    <view class="notch">
      <text>09:41</text>
      <text><text class="dot" />ONLINE</text>
      <text>v3.1</text>
    </view>
    <view class="titlebar">
      <view class="back" @click="uni.navigateBack()"><text>‹</text></view>
      <text class="title">订单详情</text>
      <view class="more"><text>···</text></view>
    </view>

    <view class="dossier-cover" style="--mark-color: var(--c-accent)">
      <view class="cover-cust-row">
        <text class="cover-cust">{{ detail.cust }}</text>
        <StatusTag :status="detail.status"/>
      </view>
      <view class="cover-amt">
        <text class="cur">¥</text>
        <text class="num">{{ formatCents(detail.amtCents) }}</text>
      </view>
      <view class="cover-meta">
        <text class="mono">{{ detail.no }}</text>
        <text class="sep">·</text>
        <text class="mono">{{ detail.date }}</text>
        <text class="sep">·</text>
        <text class="mono">{{ detail.qty }}</text>
      </view>
    </view>

    <view class="action-bar">
      <view
        v-for="act in nextActions"
        :key="act.key"
        class="action-btn"
        :class="[act.accent ? 'accent' : '', act.danger ? 'danger' : '', !act.allowed ? 'is-locked' : '']"
        :disabled="!act.allowed"
        @click="onAction(act)"
      >
        <text>{{ act.label }}</text>
        <text v-if="!act.allowed" class="lock">· 无权限</text>
      </view>
      <view v-if="!nextActions.length" class="action-done">
        <IconBox name="tag" :size="14" color="var(--c-ok)"/>
        <text>订单已结束</text>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-green)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="store" :size="14" color="var(--c-green)"/>
        </view>
        <text class="dossier-section-title">物料明细</text>
        <text class="dossier-section-meta">{{ detail.lines.length }} 行 · 共 {{ detail.qty }}</text>
      </view>
      <view class="dossier-section-body">
        <view v-for="(l, i) in detail.lines" :key="i" class="info-row">
          <view style="flex:1; min-width:0;">
            <text style="font-size:13px; font-weight:600; color:var(--c-ink); display:block;">{{ l.name }}</text>
            <text style="font-size:11px; color:var(--c-mute); margin-top:2px; display:block;">{{ l.spec }}</text>
          </view>
          <view style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
            <text style="font-family:var(--ff-mono); font-size:10px; color:var(--c-mute);">{{ l.qty }} {{ l.unit }}</text>
            <text style="font-family:var(--ff-display); font-size:13px; font-weight:600; color:var(--c-ink);">¥ {{ formatCents(l.cents) }}</text>
          </view>
        </view>
        <view style="display:flex; justify-content:space-between; align-items:center; padding:10px 18px; background:var(--c-paper); border-top:1px solid var(--c-line-soft);">
          <text style="font-size:12px; color:var(--c-mute);">小计</text>
          <text style="font-family:var(--ff-display); font-size:13px; font-weight:700; color:var(--c-ink);">¥ {{ formatCents(subtotal) }}</text>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-gold)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="report" :size="14" color="var(--c-gold)"/>
        </view>
        <text class="dossier-section-title">金额合计</text>
      </view>
      <view class="dossier-section-body">
        <view class="info-row">
          <text class="info-label">商品小计</text>
          <text class="info-val" style="text-align:right; font-family:var(--ff-mono);">¥ {{ formatCents(detail.amtCents) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">运费</text>
          <text class="info-val" style="text-align:right; font-family:var(--ff-mono);">¥ {{ formatCents(detail.shipCents) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">税额 (13%)</text>
          <text class="info-val" style="text-align:right; font-family:var(--ff-mono);">¥ {{ formatCents(detail.taxCents) }}</text>
        </view>
        <view class="info-row" style="background:var(--c-paper); border-top:1px solid var(--c-line-soft);">
          <text class="info-label" style="font-size:13px; font-weight:600; color:var(--c-ink);">实付总额</text>
          <text class="info-val" style="text-align:right; font-family:var(--ff-display); font-size:15px; font-weight:700; color:var(--c-ink);">¥ {{ formatCents(detail.totalCents) }}</text>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-blue)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="location" :size="14" color="var(--c-blue)"/>
        </view>
        <text class="dossier-section-title">配送信息</text>
      </view>
      <view class="dossier-section-body">
        <view class="info-row">
          <text class="info-label">收货地址</text>
          <text class="info-val">{{ detail.address }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">承运物流</text>
          <text class="info-val">{{ detail.carrier }}</text>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-accent)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="clock" :size="14" color="var(--c-accent)"/>
        </view>
        <text class="dossier-section-title">流转日志</text>
        <text class="dossier-section-meta">5 条</text>
      </view>
      <view class="dossier-section-body">
        <view v-for="(t, i) in detail.timeline" :key="i" class="tl-item">
          <view class="tl-dot" :class="t.status === 'current' ? 'cur' : ''"/>
          <view class="tl-body">
            <view class="tl-top">
              <text class="tl-who">{{ t.who }}</text>
              <text class="tl-ts">{{ t.ts }}</text>
            </view>
            <text class="tl-text">{{ t.text }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="footer-meta">{{ detail.no }} · 销卓宝 v3.1</view>
  </view>
</template>

<style scoped>
.page { background: var(--c-paper); padding-bottom: 24px; }

.titlebar .back {
  position: absolute; left: 12px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: var(--c-ink);
  border-radius: var(--r-pill);
}
.titlebar .more {
  position: absolute; right: 12px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; color: var(--c-mute);
}

.dossier-cover { display: flex; flex-direction: column; gap: 6px; }
.cover-cust-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cover-cust {
  font-family: var(--ff-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--c-ink);
  letter-spacing: -0.005em;
  flex: 1;
  min-width: 0;
}
.cover-amt {
  display: flex; align-items: baseline;
  font-family: var(--ff-display);
  color: var(--c-ink);
  margin-top: 4px;
}
.cover-amt .cur { font-size: 14px; font-weight: 500; opacity: 0.6; margin-right: 2px; }
.cover-amt .num { font-size: 28px; font-weight: 700; letter-spacing: -0.01em; }
.cover-meta { display: flex; align-items: center; gap: 6px; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.04em; }
.cover-meta .mono { font-family: var(--ff-mono); }
.cover-meta .sep { opacity: 0.5; }

.footer-meta { text-align: center; padding: 20px 16px 0; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.06em; }
</style>
