<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  SHIPMENT_TRANSITIONS, SHIPMENT_TRANSITION_ROLES, type ShipmentStatus,
} from '../../utils/state';
import { formatCents } from '../../utils/amount';
import IconBox from '../../components/IconBox/IconBox.vue';

const status = ref<ShipmentStatus>('DRAFT');
const role = ref<'SALES' | 'FINANCE' | 'REGION_MGR' | 'ADMIN' | 'CS'>('SALES');

const form = ref({
  customer: '上海建工建材有限公司',
  contact: '张工 · 15938000123',
  addr: '上海浦东新区张江高科园区蔡伦路 88 号',
  product: 'JS 聚合物防水涂料 18kg',
  qty: '15',
  unit: '桶',
  productPriceCents: '33800',
  expectedDate: '2026-07-22',
  reason: '客户紧急补货 / 项目工期紧',
  note: '请联系工地张工确认收货时间',
});

const reasons = ['客户紧急补货 / 项目工期紧', '物料替代 / 短缺', '临时变更', '其他 (备注)'];

const steps = ['DRAFT', 'SUBMITTED', 'DISPATCHED', 'DELIVERED'] as const;
const stepLabels = ['草稿', '已提交', '已发货', '已签收'];
const currentStepIndex = computed(() => steps.indexOf(status.value));

const next = computed(() => SHIPMENT_TRANSITIONS[status.value] ?? []);
const nextActions = computed(() =>
  next.value.map(to => ({
    to,
    key: status.value + '->' + to,
    allowed: (SHIPMENT_TRANSITION_ROLES[status.value + '->' + to] ?? []).includes(role.value),
    label: ({
      'DRAFT->SUBMITTED':      '提交审批',
      'DRAFT->CANCELED':       '取消',
      'SUBMITTED->DISPATCHED': '确认发货',
      'SUBMITTED->CANCELED':   '撤回',
      'DISPATCHED->DELIVERED': '客户已签收',
      'DISPATCHED->CANCELED':  '拦截作废',
    } as Record<string, string>)[status.value + '->' + to] || (status.value + '->' + to),
    accent: !to.endsWith('CANCELED'),
    danger: to.endsWith('CANCELED'),
  })),
);

function onAction(act) {
  if (!act.allowed) {
    uni.showToast({ title: '当前角色无此操作权限', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '确认' + act.label,
    content: '状态将从 ' + status.value + ' 变更为 ' + act.to,
    success: function(res) {
      if (res.confirm) {
        status.value = act.to;
        uni.showToast({ title: '状态已更新', icon: 'success' });
      }
    },
  });
}

function onSave() {
  uni.showToast({ title: '草稿已保存到本地', icon: 'success' });
}

const totalCents = computed(() => {
  const cents = parseInt(form.value.productPriceCents, 10) || 0;
  const qty = parseInt(form.value.qty, 10) || 0;
  return cents * qty;
});
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
      <text class="title">无订单发货</text>
      <view class="save-btn" @click="onSave">
        <text>草稿</text>
      </view>
    </view>

    <view class="dossier-cover" style="--mark-color: var(--c-accent)">
      <view class="cover-cust-row">
        <text class="cover-cust">无订单发货单</text>
        <view class="status-pill">
          <view class="dot" :class="status"/>
          <text class="status-text">{{ status }}</text>
        </view>
      </view>
      <view class="cover-amt">
        <text class="cur">¥</text>
        <text class="num">{{ formatCents(String(totalCents)) }}</text>
      </view>
      <view class="cover-meta">
        <text class="mono">{{ form.product }}</text>
        <text class="sep">·</text>
        <text class="mono">{{ form.qty }} {{ form.unit }}</text>
      </view>
    </view>

    <!-- 进度条 (B 化: 节点配色 + 朱砂主线) -->
    <view class="stepper">
      <view
        v-for="(s, i) in steps"
        :key="s"
        class="step"
        :class="{ done: i < currentStepIndex, active: i === currentStepIndex }"
      >
        <view class="step-dot">
          <text v-if="i < currentStepIndex" class="tick">✓</text>
          <text v-else>{{ i + 1 }}</text>
        </view>
        <text class="step-label">{{ stepLabels[i] }}</text>
        <view v-if="i < steps.length - 1" class="step-line" :class="{ done: i < currentStepIndex }"/>
      </view>
    </view>

    <!-- 客户信息 · 蓝色条 -->
    <view class="dossier-section" style="--mark-color: var(--c-blue)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="user" :size="14" color="var(--c-blue)"/>
        </view>
        <text class="dossier-section-title">客户信息</text>
      </view>
      <view class="dossier-section-body">
        <view class="info-row">
          <text class="info-label">客户</text>
          <view class="picker">
            <text>{{ form.customer }}</text>
            <IconBox name="chev-down" :size="12" color="var(--c-mute)"/>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">联系人</text>
          <text class="info-val">{{ form.contact }}</text>
        </view>
        <view class="info-row" style="align-items:flex-start;">
          <text class="info-label">配送地址</text>
          <view class="addr">
            <IconBox name="location" :size="14" color="var(--c-mute)"/>
            <text>{{ form.addr }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 物料明细 · 绿色条 -->
    <view class="dossier-section" style="--mark-color: var(--c-green)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="ship" :size="14" color="var(--c-green)"/>
        </view>
        <text class="dossier-section-title">物料明细</text>
        <text class="dossier-section-meta">单价 ¥{{ formatCents(form.productPriceCents) }}</text>
      </view>
      <view class="dossier-section-body">
        <view class="info-row">
          <text class="info-label">物料</text>
          <view class="picker">
            <text>{{ form.product }}</text>
            <IconBox name="chev-down" :size="12" color="var(--c-mute)"/>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">数量</text>
          <view class="qty-row">
            <view class="qty-btn">-</view>
            <input class="qty-input" v-model="form.qty"/>
            <view class="qty-btn">+</view>
            <text class="unit">{{ form.unit }}</text>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">期望发货</text>
          <view class="picker">
            <IconBox name="clock" :size="12" color="var(--c-mute)"/>
            <text>{{ form.expectedDate }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 原因说明 · 朱砂条 -->
    <view class="dossier-section" style="--mark-color: var(--c-accent)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="tag" :size="14" color="var(--c-accent)"/>
        </view>
        <text class="dossier-section-title">原因说明</text>
      </view>
      <view class="dossier-section-body">
        <view style="display:flex; flex-wrap:wrap; gap:6px; padding:10px 18px;">
          <view
            v-for="r in reasons"
            :key="r"
            class="chip"
            :class="{ active: form.reason === r }"
            @click="form.reason = r"
          >{{ r }}</view>
        </view>
        <view style="padding:0 18px 14px;">
          <textarea class="note" v-model="form.note" placeholder="补充说明 (选填,最多 200 字)"/>
        </view>
      </view>
    </view>

    <!-- 审批流 · 金色条 -->
    <view class="dossier-section" style="--mark-color: var(--c-gold)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="approval" :size="14" color="var(--c-gold)"/>
        </view>
        <text class="dossier-section-title">审批流</text>
        <text class="dossier-section-meta">SALES · 当前</text>
      </view>
      <view class="dossier-section-body">
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
        </view>
      </view>
    </view>

    <view class="footer-meta">DRAFT · v3.1 · 草稿自动保存到本地</view>
  </view>
</template>

<style scoped>
.page { background: var(--c-paper); padding-bottom: 32px; }

.titlebar .back {
  position: absolute; left: 12px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: var(--c-ink);
  border-radius: var(--r-pill);
}
.titlebar .save-btn {
  position: absolute; right: 12px;
  padding: 4px 12px;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-pill);
  font-size: 12px;
  font-weight: 600;
  color: var(--c-accent);
}

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
.cover-amt .cur { font-size: 14px; opacity: 0.6; margin-right: 2px; }
.cover-amt .num { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; }
.cover-meta { display: flex; align-items: center; gap: 6px; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.04em; }
.cover-meta .mono { font-family: var(--ff-mono); }
.cover-meta .sep { opacity: 0.5; }

/* 状态徽章 */
.status-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-pill);
  flex-shrink: 0;
}
.status-pill .dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--c-mute);
}
.status-pill .dot.DRAFT      { background: var(--c-mute); }
.status-pill .dot.SUBMITTED  { background: var(--c-warn); }
.status-pill .dot.DISPATCHED { background: var(--c-blue); }
.status-pill .dot.DELIVERED  { background: var(--c-ok); }
.status-text {
  font-family: var(--ff-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--c-ink);
  letter-spacing: 0.04em;
}

/* 进度条 */
.stepper {
  display: flex;
  align-items: flex-start;
  padding: 16px 14px;
  margin: 12px 16px 0;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  position: relative;
}
.stepper::before {
  content: '';
  position: absolute;
  left: 0; right: 0; top: 0;
  height: 3px;
  background: var(--c-accent);
  border-radius: var(--r-md) var(--r-md) 0 0;
}
.step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.step-dot {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--c-paper);
  border: 1.5px solid var(--c-line);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--ff-mono);
  font-size: 11px;
  color: var(--c-mute);
}
.step.done .step-dot { background: var(--c-ok); border-color: var(--c-ok); color: #fff; }
.step.active .step-dot { background: var(--c-accent); border-color: var(--c-accent); color: #fff; }
.step-label {
  font-size: 10px;
  color: var(--c-mute);
  margin-top: 6px;
  letter-spacing: 0.04em;
}
.step.done .step-label,
.step.active .step-label { color: var(--c-ink); font-weight: 600; }
.step-line {
  position: absolute;
  left: 60%; right: -40%; top: 13px;
  height: 1px;
  background: var(--c-line);
}
.step-line.done { background: var(--c-ok); }
.tick { font-size: 14px; font-weight: 700; }

/* 表单内部控件 (dossier-section-body 内) */
.picker {
  flex: 1;
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px;
  background: var(--c-paper);
  border-radius: 6px;
  font-size: 13px;
  color: var(--c-ink);
  gap: 6px;
}
.addr {
  display: flex; align-items: flex-start; gap: 6px;
  padding: 6px 10px;
  background: var(--c-paper);
  border-radius: 6px;
  font-size: 12px;
  color: var(--c-ink);
  line-height: 1.5;
  flex: 1;
}

.qty-row { display: flex; align-items: center; gap: 8px; }
.qty-btn {
  width: 28px; height: 28px;
  background: var(--c-paper);
  border: 1px solid var(--c-line-soft);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--c-ink);
}
.qty-input {
  width: 56px; height: 28px;
  background: var(--c-paper);
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
  color: var(--c-ink);
  border: 1px solid var(--c-line-soft);
}
.unit { font-size: 12px; color: var(--c-mute); margin-left: 4px; }

/* chips */
.chip {
  padding: 5px 12px;
  font-size: 12px;
  color: var(--c-mute);
  background: var(--c-paper);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-pill);
  flex-shrink: 0;
}
.chip.active {
  background: var(--c-accent-soft);
  color: var(--c-accent);
  border-color: var(--c-accent);
  font-weight: 600;
}
.note {
  width: 100%;
  padding: 10px 12px;
  background: var(--c-paper);
  border: 1px solid var(--c-line-soft);
  border-radius: 6px;
  font-size: 12px;
  color: var(--c-ink);
  min-height: 64px;
  font-family: var(--ff-body);
  box-sizing: border-box;
}

.footer-meta {
  text-align: center;
  padding: 20px 16px 0;
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.06em;
}
</style>
