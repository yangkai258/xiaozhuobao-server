<script setup lang="ts">
import { ref } from 'vue';
import IconBox from '../../components/IconBox/IconBox.vue';
import StatusTag from '../../components/StatusTag/StatusTag.vue';

const customer = {
  name: '上海建工建材有限公司',
  no: 'BP100001',
  contractNo: 'C-2026-001',
  region: '上海',
  level: 'VIP',
  status: '已生成',
  amtY: '48200000',
  amtM: '8400000',
  amtQ: '31200000',
  pctM: 78,
  pctQ: 65,
  pctY: 90,
  contact: '张工 · 15938000123',
  address: '上海浦东新区张江高科园区蔡伦路 88 号',
  tax: '91310115MA1K3X9P2J',
};

const orders = [
  { no: 'SO20260716-001', amt: '12480.00', status: '已发货', date: '07-16' },
  { no: 'SO20260709-018', amt: '8200.00', status: '已完成', date: '07-09' },
  { no: 'SO20260701-005', amt: '22300.00', status: '已完成', date: '07-01' },
];
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
      <text class="title">客户详情</text>
      <view class="more"><text>···</text></view>
    </view>

    <view class="dossier-cover" style="--mark-color: var(--c-blue)">
      <view class="cover-cust-row">
        <view class="cover-avatar">{{ customer.name.charAt(0) }}</view>
        <view style="flex:1; min-width:0;">
          <view style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <text class="cover-cust">{{ customer.name }}</text>
            <StatusTag :status="customer.status"/>
          </view>
          <text class="cover-no">{{ customer.no }} · {{ customer.contractNo }}</text>
        </view>
      </view>
      <view class="cover-tags">
        <text class="tag">{{ customer.level }}</text>
        <text class="tag">{{ customer.region }}</text>
      </view>
    </view>

    <!-- KPI 财务摘要 -->
    <view class="kpi-card">
      <view class="kpi-cell first">
        <text class="kpi-label">本年 GMV</text>
        <text class="kpi-val">¥ 482K</text>
      </view>
      <view style="width:1px; background:var(--c-line-soft);" />
      <view class="kpi-cell">
        <text class="kpi-label">订单数</text>
        <text class="kpi-val">28</text>
      </view>
      <view style="width:1px; background:var(--c-line-soft);" />
      <view class="kpi-cell">
        <text class="kpi-label">账信余额</text>
        <text class="kpi-val warn">¥ 50K</text>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-blue)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="phone" :size="14" color="var(--c-blue)"/>
        </view>
        <text class="dossier-section-title">联系方式</text>
      </view>
      <view class="dossier-section-body">
        <view class="info-row">
          <text class="info-label">联系人</text>
          <text class="info-val">{{ customer.contact }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">地址</text>
          <text class="info-val">{{ customer.address }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">税号</text>
          <text class="info-val" style="font-family:var(--ff-mono); font-size:11px;">{{ customer.tax }}</text>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-gold)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="report" :size="14" color="var(--c-gold)"/>
        </view>
        <text class="dossier-section-title">业绩表现</text>
      </view>
      <view class="dossier-section-body">
        <view class="info-row">
          <text class="info-label">本月</text>
          <view style="flex:1; display:flex; align-items:center; gap:8px;">
            <view style="flex:1; height:6px; background:var(--c-paper); border-radius:3px; overflow:hidden;">
              <view :style="{ width: customer.pctM + '%', height:'100%', background:'var(--c-gold)' }"/>
            </view>
            <text style="font-family:var(--ff-mono); font-size:11px; color:var(--c-ink);">¥ 84K</text>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">本季</text>
          <view style="flex:1; display:flex; align-items:center; gap:8px;">
            <view style="flex:1; height:6px; background:var(--c-paper); border-radius:3px; overflow:hidden;">
              <view :style="{ width: customer.pctQ + '%', height:'100%', background:'var(--c-gold)' }"/>
            </view>
            <text style="font-family:var(--ff-mono); font-size:11px; color:var(--c-ink);">¥ 312K</text>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">本年</text>
          <view style="flex:1; display:flex; align-items:center; gap:8px;">
            <view style="flex:1; height:6px; background:var(--c-paper); border-radius:3px; overflow:hidden;">
              <view :style="{ width: customer.pctY + '%', height:'100%', background:'var(--c-gold)' }"/>
            </view>
            <text style="font-family:var(--ff-mono); font-size:11px; color:var(--c-ink);">¥ 482K</text>
          </view>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-accent)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="clock" :size="14" color="var(--c-accent)"/>
        </view>
        <text class="dossier-section-title">最近订单</text>
        <text class="dossier-section-meta">3 条</text>
      </view>
      <view class="dossier-section-body">
        <view v-for="(o, i) in orders" :key="i" class="info-row">
          <view style="flex:1; min-width:0;">
            <text style="font-family:var(--ff-mono); font-size:11px; color:var(--c-ink); display:block;">{{ o.no }}</text>
            <text style="font-size:10px; color:var(--c-mute); margin-top:2px; display:block;">{{ o.date }}</text>
          </view>
          <view style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <text style="font-family:var(--ff-display); font-size:13px; font-weight:600; color:var(--c-ink);">¥ {{ o.amt }}</text>
            <StatusTag :status="o.status"/>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-actions">
      <view class="b-btn ghost">
        <IconBox name="phone" :size="14" color="var(--c-ink)"/>
        <text>联系</text>
      </view>
      <view class="b-btn ghost">
        <IconBox name="location" :size="14" color="var(--c-ink)"/>
        <text>导航</text>
      </view>
      <view class="b-btn primary">
        <IconBox name="ship" :size="14" color="#fff"/>
        <text>新建发货</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { background: var(--c-paper); padding-bottom: 96px; }

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

.dossier-cover { display: flex; flex-direction: column; gap: 10px; }
.cover-cust-row { display: flex; align-items: center; gap: 12px; }
.cover-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--c-paper);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--ff-display); font-size: 18px; font-weight: 700;
  color: var(--c-ink);
  flex-shrink: 0;
}
.cover-avatar::before {
  content: '';
  position: absolute;
}
.cover-cust {
  font-family: var(--ff-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--c-ink);
  letter-spacing: -0.005em;
}
.cover-no {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.04em;
  margin-top: 2px;
  display: block;
}
.cover-tags { display: flex; gap: 6px; }
.cover-tags .tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-pill);
  color: var(--c-ink);
}

/* KPI */
.kpi-card {
  display: flex;
  margin: 12px 16px 0;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  padding: 12px 0;
  position: relative;
  overflow: hidden;
}
.kpi-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--c-blue);
}
.kpi-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
  align-items: center;
}
.kpi-cell.first { align-items: flex-start; padding-left: 14px; }
.kpi-label {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.06em;
}
.kpi-val {
  font-family: var(--ff-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--c-ink);
}
.kpi-val.warn { color: var(--c-accent); }

/* 底部操作条 */
.bottom-actions {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  display: flex;
  gap: 8px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--c-paper);
  border-top: 1px solid var(--c-line-soft);
}
.b-btn {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  gap: 6px;
  padding: 11px 0;
  border-radius: var(--r-md);
  font-size: 13px;
  font-weight: 600;
}
.b-btn.ghost {
  background: var(--c-paper-2);
  color: var(--c-ink);
  border: 1px solid var(--c-line);
}
.b-btn.primary {
  background: var(--c-accent);
  color: #fff;
}
</style>
