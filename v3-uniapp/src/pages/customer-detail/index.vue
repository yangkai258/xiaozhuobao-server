<script setup lang="ts">
import { ref, onMounted } from 'vue';
import IconBox from '../../components/IconBox/IconBox.vue';
import StatusTag from '../../components/StatusTag/StatusTag.vue';
import { api_customers } from '../../api/client';
import { formatCents } from '../../utils/amount';

type RecentOrder = { id: string; no: string; amtCents: string; status: string; orderDate: string };
type CustomerDetail = {
  id: string;
  bp: string;
  code: string;
  name: string;
  cat: string;
  status: string;
  contact: string;
  addr: string;
  regionBp: string | null;
  stats: { orderCount: string; orderTotalCents: string; aftersaleCount: string; projectCount: string };
  recentOrders: RecentOrder[];
};

const detail = ref<CustomerDetail | null>(null);

onMounted(async () => {
  const pages = (typeof getCurrentPages === 'function' ? getCurrentPages() : []) as Array<{ options?: Record<string, string> }>;
  const opts = pages.at(-1)?.options ?? {};
  const id = opts.bp || opts.id || '';
  if (!id) return;
  try {
    const r = await api_customers.byId(id);
    detail.value = r.data as CustomerDetail;
  } catch {
    // ponytail: customer not found or auth failed; page renders empty state
  }
});

function avatar(): string {
  const n = detail.value?.name || '?';
  return n.charAt(0);
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
      <text class="title">客户详情</text>
      <view class="more"><text>···</text></view>
    </view>

    <view v-if="!detail" class="loading"><text>客户档案加载中...</text></view>
    <view v-else>
    <view class="dossier-cover" style="--mark-color: var(--c-blue)">
      <view class="cover-cust-row">
        <view class="cover-avatar">{{ avatar() }}</view>
        <view style="flex:1; min-width:0;">
          <view style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <text class="cover-cust">{{ detail.name }}</text>
            <StatusTag :status="detail.status"/>
          </view>
          <text class="cover-no">{{ detail.code }} · {{ detail.bp }} · {{ detail.cat }}</text>
        </view>
      </view>
      <view class="cover-tags">
        <text class="tag">{{ detail.regionBp || '未分配区域' }}</text>
        <text class="tag">{{ detail.cat }}</text>
      </view>
    </view>

    <!-- KPI 摘要（来自后端 stats） -->
    <view class="kpi-card">
      <view class="kpi-cell first">
        <text class="kpi-label">累计 GMV</text>
        <text class="kpi-val">¥ {{ formatCents(detail.stats.orderTotalCents) }}</text>
      </view>
      <view style="width:1px; background:var(--c-line-soft);" />
      <view class="kpi-cell">
        <text class="kpi-label">订单数</text>
        <text class="kpi-val">{{ detail.stats.orderCount }}</text>
      </view>
      <view style="width:1px; background:var(--c-line-soft);" />
      <view class="kpi-cell">
        <text class="kpi-label">售后/项目</text>
        <text class="kpi-val warn">{{ detail.stats.aftersaleCount }} / {{ detail.stats.projectCount }}</text>
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
          <text class="info-val">{{ detail.contact }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">地址</text>
          <text class="info-val">{{ detail.addr }}</text>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-accent)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="clock" :size="14" color="var(--c-accent)"/>
        </view>
        <text class="dossier-section-title">最近订单</text>
        <text class="dossier-section-meta">{{ detail.recentOrders.length }} 条</text>
      </view>
      <view class="dossier-section-body">
        <view v-for="o in detail.recentOrders" :key="o.id" class="info-row">
          <view style="flex:1; min-width:0;">
            <text style="font-family:var(--ff-mono); font-size:11px; color:var(--c-ink); display:block;">{{ o.no }}</text>
            <text style="font-size:10px; color:var(--c-mute); margin-top:2px; display:block;">{{ o.orderDate }}</text>
          </view>
          <view style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <text style="font-family:var(--ff-display); font-size:13px; font-weight:600; color:var(--c-ink);">¥ {{ formatCents(o.amtCents) }}</text>
            <StatusTag :status="o.status"/>
          </view>
        </view>
        <view v-if="!detail.recentOrders.length" class="info-row">
          <text class="info-label">暂无订单</text>
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
      <view class="b-btn primary" @click="uni.navigateTo({ url: '/pages/shipment-new/index' })">
        <IconBox name="ship" :size="14" color="#fff"/>
        <text>新建发货</text>
      </view>
    </view>
    </view>
  </view>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 80px 0;
  color: var(--c-mute);
  font-size: 13px;
}
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

.dossier-cover { display: flex; flex-direction: column; gap: 8px; padding: 16px; margin: 0 16px; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); position: relative; }
.dossier-cover::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--mark-color); }
.cover-cust-row { display: flex; align-items: center; gap: 12px; }
.cover-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--c-blue); color: #fff; display: flex; align-items: center; justify-content: center; font-family: var(--ff-display); font-weight: 700; font-size: 18px; flex-shrink: 0; }
.cover-cust { font-family: var(--ff-display); font-size: 17px; font-weight: 600; color: var(--c-ink); }
.cover-no { font-family: var(--ff-mono); font-size: 11px; color: var(--c-mute); margin-top: 2px; display: block; }
.cover-tags { display: flex; gap: 6px; margin-top: 4px; }
.tag { font-size: 10px; padding: 2px 8px; border-radius: var(--r-pill); background: var(--c-paper); border: 1px solid var(--c-line-soft); color: var(--c-ink); }

.kpi-card { display: flex; margin: 10px 16px 0; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); padding: 12px 8px; }
.kpi-cell { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
.kpi-cell.first { padding-left: 4px; }
.kpi-label { font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.06em; }
.kpi-val { font-family: var(--ff-display); font-size: 16px; font-weight: 700; color: var(--c-ink); }
.kpi-val.warn { color: var(--c-accent); }

.dossier-section { margin: 14px 16px 0; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); position: relative; overflow: hidden; }
.dossier-section::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--mark-color); }
.dossier-section-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--c-line-soft); }
.dossier-section-mark { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background: var(--c-paper); border-radius: var(--r-pill); }
.dossier-section-title { font-family: var(--ff-display); font-size: 13px; font-weight: 600; color: var(--c-ink); flex: 1; }
.dossier-section-meta { font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); }
.dossier-section-body { padding: 0; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--c-line-soft); }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 12px; color: var(--c-mute); flex-shrink: 0; }
.info-val { font-size: 12px; color: var(--c-ink); text-align: right; min-width: 0; }

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
