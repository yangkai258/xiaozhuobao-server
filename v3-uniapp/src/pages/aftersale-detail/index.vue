<script setup lang="ts">
import { ref } from 'vue';
import IconBox from '../../components/IconBox/IconBox.vue';
import StatusTag from '../../components/StatusTag/StatusTag.vue';

const aftersale = {
  no: 'AF20260716-005',
  status: '处理中',
  material: 'JS 聚合物防水涂料 18kg',
  reason: '破损',
  qty: '3 桶',
  relatedOrder: 'SO20260715-023',
  date: '2026-07-16',
  desc: '客户收货时发现 3 桶涂料包装破损，已拍照取证。需质量部门责任判定后决定退换或补偿。',
  customer: '深圳南方装饰工程部',
  contact: '王经理 · 17613880099',
  address: '深圳福田南区大道 6008 号',
  photos: 3,
};

const timeline = [
  { ts: '07-16 14:22', who: '王经理', text: '提交售后申请 · 含 3 张照片', current: true },
  { ts: '07-16 15:10', who: '张明 (销售)', text: '核实情况 · 转交质量部门' },
  { ts: '07-16 17:08', who: '李工 (质量)', text: '判定为运输破损 · 建议退换' },
  { ts: '07-17 09:41', who: '财务', text: '已审批 · 等待 OA 流程' },
];

function onAction(label, danger) {
  if (danger) {
    uni.showModal({ title: '确认' + label, content: '该操作将通知客户', success: r => { if (r.confirm) uni.showToast({ title: '已' + label, icon: 'success' }); } });
  } else {
    uni.showToast({ title: '已' + label, icon: 'success' });
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
      <view class="back" @click="uni.navigateBack()"><text>‹</text></view>
      <text class="title">售后详情</text>
      <view class="more"><text>···</text></view>
    </view>

    <view class="dossier-cover" style="--mark-color: var(--c-accent)">
      <view class="cover-cust-row">
        <text class="cover-cust">{{ aftersale.material }}</text>
        <StatusTag :status="aftersale.status"/>
      </view>
      <view class="cover-meta">
        <text class="mono">{{ aftersale.no }}</text>
        <text class="sep">·</text>
        <text class="mono">{{ aftersale.date }}</text>
      </view>
      <view class="cover-related">
        <text class="rel-label">关联订单</text>
        <text class="mono">{{ aftersale.relatedOrder }}</text>
      </view>
    </view>

    <view class="action-bar">
      <view class="action-btn accent" @click="onAction('同意退换')">
        <text>同意退换</text>
      </view>
      <view class="action-btn" @click="onAction('补充材料')">
        <text>补充材料</text>
      </view>
      <view class="action-btn danger" @click="onAction('驳回', true)">
        <text>驳回</text>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-accent)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="complaint" :size="14" color="var(--c-accent)"/>
        </view>
        <text class="dossier-section-title">售后原因</text>
      </view>
      <view class="dossier-section-body">
        <view class="info-row">
          <text class="info-label">类型</text>
          <text class="info-val">
            <text class="reason-pill">{{ aftersale.reason }}</text>
          </text>
        </view>
        <view class="info-row">
          <text class="info-label">数量</text>
          <text class="info-val" style="font-family:var(--ff-mono);">{{ aftersale.qty }}</text>
        </view>
        <view class="info-row" style="align-items:flex-start;">
          <text class="info-label">说明</text>
          <text class="info-val" style="line-height:1.6;">{{ aftersale.desc }}</text>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-blue)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="phone" :size="14" color="var(--c-blue)"/>
        </view>
        <text class="dossier-section-title">客户信息</text>
      </view>
      <view class="dossier-section-body">
        <view class="info-row">
          <text class="info-label">客户名称</text>
          <text class="info-val">{{ aftersale.customer }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">联系人</text>
          <text class="info-val">{{ aftersale.contact }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">收货地址</text>
          <text class="info-val">{{ aftersale.address }}</text>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-green)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="ship" :size="14" color="var(--c-green)"/>
        </view>
        <text class="dossier-section-title">凭证 ({{ aftersale.photos }})</text>
        <text class="dossier-section-meta">照片 · PDF</text>
      </view>
      <view class="dossier-section-body">
        <view style="display:flex; gap:8px; padding:10px 18px;">
          <view v-for="i in aftersale.photos" :key="i" class="photo">
            <IconBox :name="i === aftersale.photos ? 'tag' : 'store'" :size="20" color="var(--c-mute)"/>
          </view>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-gold)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="clock" :size="14" color="var(--c-gold)"/>
        </view>
        <text class="dossier-section-title">流转日志</text>
        <text class="dossier-section-meta">{{ timeline.length }} 条</text>
      </view>
      <view class="dossier-section-body">
        <view v-for="(t, i) in timeline" :key="i" class="tl-item">
          <view class="tl-dot" :class="t.current ? 'cur' : ''"/>
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

    <view class="footer-meta">{{ aftersale.no }} · 销卓宝 v3.1</view>
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

.dossier-cover { display: flex; flex-direction: column; gap: 8px; }
.cover-cust-row { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.cover-cust {
  font-family: var(--ff-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--c-ink);
  letter-spacing: -0.005em;
  flex: 1;
  min-width: 0;
}
.cover-meta { display: flex; align-items: center; gap: 6px; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.04em; }
.cover-meta .mono { font-family: var(--ff-mono); }
.cover-meta .sep { opacity: 0.5; }
.cover-related {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: var(--c-paper);
  border-radius: var(--r-sm);
  margin-top: 4px;
}
.rel-label {
  font-size: 10px; color: var(--c-mute); letter-spacing: 0.04em;
}

.reason-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  background: var(--c-accent-soft);
  color: var(--c-accent);
  border-radius: var(--r-pill);
  display: inline-block;
}

.photo {
  width: 64px; height: 64px;
  background: var(--c-paper);
  border: 1px dashed var(--c-line);
  border-radius: var(--r-sm);
  display: flex; align-items: center; justify-content: center;
}

.footer-meta { text-align: center; padding: 20px 16px 0; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.06em; }
</style>
