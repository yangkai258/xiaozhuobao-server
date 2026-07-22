<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ORDER_TRANSITIONS, ORDER_TRANSITION_ROLES, type OrderStatus } from '../../utils/state';
import { formatCents, addCents } from '../../utils/amount';
import IconBox from '../../components/IconBox/IconBox.vue';
import StatusTag from '../../components/StatusTag/StatusTag.vue';
import { api_orders } from '../../api/client';

type OrderItem = { productName: string; spec: string; qty: number; unit: string; priceCents: string };
type OrderLog = { id: string; action: string; actor: string; at: string; remark: string | null };
type OrderDetail = {
  no: string;
  customerName: string;
  status: string;
  statusCode: OrderStatus;
  amtCents: string;
  qty: string;
  orderDate: string;
  address: string | null;
  items: OrderItem[];
  logs: OrderLog[];
};

const detail = ref<OrderDetail | null>(null);
const status = ref<OrderStatus>('DRAFT');
const role = ref<'SALES' | 'FINANCE' | 'REGION_MGR' | 'ADMIN' | 'CS'>('SALES');

onMounted(async () => {
  const pages = (typeof getCurrentPages === 'function' ? getCurrentPages() : []) as Array<{ options?: Record<string, string> }>;
  const opts = pages.at(-1)?.options ?? {};
  const no = opts.no || '';
  if (!no) return;
  try {
    const r = await api_orders.byId(no);
    const d = r.data as OrderDetail;
    detail.value = d;
    status.value = (d.statusCode as OrderStatus) || 'DRAFT';
  } catch (err) {
    // ponytail: order not found or auth failed; leave detail null so the page renders its empty state
  }
});

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

const subtotal = computed(() => detail.value ? addCents(...detail.value.items.map(i => i.priceCents)) : '0');
</script>

<template>
  <view class="page">
    <view v-if="!detail" class="loading"><text>订单加载中...</text></view>
    <view v-else>
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
        <text class="cover-cust">{{ detail.customerName }}</text>
        <StatusTag :status="detail.status"/>
      </view>
      <view class="cover-amt">
        <text class="cur">¥</text>
        <text class="num">{{ formatCents(detail.amtCents) }}</text>
      </view>
      <view class="cover-meta">
        <text class="mono">{{ detail.no }}</text>
        <text class="sep">·</text>
        <text class="mono">{{ detail.orderDate }}</text>
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
        <text class="dossier-section-meta">{{ detail.items.length }} 行 · 共 {{ detail.qty }}</text>
      </view>
      <view class="dossier-section-body">
        <view v-for="(l, i) in detail.items" :key="i" class="info-row">
          <view style="flex:1; min-width:0;">
            <text style="font-size:13px; font-weight:600; color:var(--c-ink); display:block;">{{ l.productName }}</text>
            <text style="font-size:11px; color:var(--c-mute); margin-top:2px; display:block;">{{ l.spec }}</text>
          </view>
          <view style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
            <text style="font-family:var(--ff-mono); font-size:10px; color:var(--c-mute);">{{ l.qty }} {{ l.unit }}</text>
            <text style="font-family:var(--ff-display); font-size:13px; font-weight:600; color:var(--c-ink);">¥ {{ formatCents(l.priceCents) }}</text>
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
        <!-- 运费 / 税额 / 物流字段后端尚未返回，留作联调后续补 -->
        
        <view class="info-row" style="background:var(--c-paper); border-top:1px solid var(--c-line-soft);">
          <text class="info-label" style="font-size:13px; font-weight:600; color:var(--c-ink);">实付总额</text>
          <text class="info-val" style="text-align:right; font-family:var(--ff-display); font-size:15px; font-weight:700; color:var(--c-ink);">¥ {{ formatCents(detail.amtCents) }}</text>
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
        
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-accent)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="clock" :size="14" color="var(--c-accent)"/>
        </view>
        <text class="dossier-section-title">流转日志</text>
        <text class="dossier-section-meta">{{ detail.logs.length }} 条</text>
      </view>
      <view class="dossier-section-body">
        <view v-for="(t, i) in detail.logs" :key="t.id" class="tl-item">
          <view class="tl-dot" :class="i === detail.logs.length - 1 ? 'cur' : ''"/>
          <view class="tl-body">
            <view class="tl-top">
              <text class="tl-who">{{ t.actor }}</text>
              <text class="tl-ts">{{ (t.at || '').slice(0, 16).replace('T', ' ') }}</text>
            </view>
            <text class="tl-text">{{ t.action }}{{ t.remark ? ' · ' + t.remark : '' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="footer-meta">{{ detail.no }} · 销卓宝 v3.1</view>
    </view>
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
