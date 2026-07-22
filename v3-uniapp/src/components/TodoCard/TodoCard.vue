<script setup lang="ts">
import StatusTag from '../StatusTag/StatusTag.vue';
import { orderStatusClass } from '../../mock/data';
defineProps<{
  no: string;
  cust: string;
  amt: number;
  status: string;
  qty: string;
  date: string;
}>();
const fmt = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
</script>

<template>
  <view class="card">
    <view class="row1">
      <view class="left">
        <view class="name">{{ cust }}</view>
        <view class="mono">{{ no }}</view>
      </view>
      <view class="amount">¥ {{ fmt(amt) }}</view>
    </view>
    <view class="meta">
      <StatusTag :status="status" :cls="orderStatusClass(status)" />
      <text class="ms">{{ qty }} · {{ date }}</text>
    </view>
  </view>
</template>

<style scoped>
.card {
  background: var(--c-paper-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-card);
  padding: 14px;
  margin-bottom: 10px;
  position: relative;
}
.card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 2px;
  background: var(--c-accent);
}
.row1 {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 6px;
  padding-left: 10px;
}
.left { min-width: 0; flex: 1; }
.name {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-ink);
  letter-spacing: -0.005em;
  line-height: 1.35;
}
.mono {
  font-family: var(--ff-mono);
  font-size: 11px;
  color: var(--c-steel);
  margin-top: 2px;
}
.amount {
  font-family: var(--ff-mono);
  font-size: 14px;
  color: var(--c-ink);
  font-weight: 600;
  white-space: nowrap;
}
.meta {
  font-size: 11px;
  color: var(--c-mute);
  line-height: 1.6;
  margin-top: 4px;
  padding-left: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ms { color: var(--c-mute); }
</style>
