<script setup lang="ts">
import FabAI from '../../components/FabAI/FabAI.vue';
import { ref, computed, onMounted } from 'vue';
import IconBox from '../../components/IconBox/IconBox.vue';
import { useInfoStore } from '../../stores';
import { formatCents } from '../../utils/amount';

const tabs = computed(() => [
  { id: 'customers', label: '客商', count: infoStore.customers.length },
  { id: 'projects',  label: '项目', count: infoStore.projects.length },
  { id: 'contracts', label: '合同', count: infoStore.contracts.length },
  { id: 'products',  label: '商品', count: infoStore.products.length },
]);
const view = ref('customers');
const infoStore = useInfoStore();
onMounted(() => { void infoStore.load(); });

// 类别样式映射
const TAG_STYLE: Record<string, { icon: string; color: string }> = {
  customer: { icon: 'user',  color: 'var(--c-blue)' },
  project:  { icon: 'rental',color: 'var(--c-warn)' },
  contract: { icon: 'tag',   color: 'var(--c-gold)' },
  product:  { icon: 'store', color: 'var(--c-green)' },
};
function tagOf(tag: string) {
  return TAG_STYLE[tag] ?? TAG_STYLE.customer;
}

// 状态颜色
const STATUS_STYLE: Record<string, string> = {
  '已生效': 'var(--c-ok)',
  '审批中': 'var(--c-warn)',
  '已驳回': 'var(--c-danger)',
  '库存充足': 'var(--c-ok)',
  '库存预警': 'var(--c-accent)',
};
function statusColor(s: string) {
  return STATUS_STYLE[s] ?? 'var(--c-mute)';
}

const list = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const matchKw = (name: string, no: string) => !kw || name.toLowerCase().includes(kw) || (no || '').toLowerCase().includes(kw);
  if (view.value === 'customers') {
    let rows = infoStore.customers.map(c => ({ name: c.name, no: c.code, status: c.status, cat: c.cat, meta: c.contact + ' · ' + c.addr, tag: 'customer', id: c.id }));
    const tab = subTab.value;
    if (tab === 1) rows = rows.filter(c => c.cat === '客户');
    else if (tab === 2) rows = rows.filter(c => c.cat === '经销商');
    else if (tab === 3) rows = rows.filter(c => c.status === '已生效');
    else if (tab === 4) rows = rows.filter(c => c.status === '审批中');
    return rows.filter(r => matchKw(r.name, r.no));
  }
  if (view.value === 'projects') return infoStore.projects.map(p => ({ name: p.name, no: p.no, status: p.status, meta: p.customerName + ' · ¥' + formatCents(p.amtCents), tag: 'project', id: p.id })).filter(r => matchKw(r.name, r.no));
  if (view.value === 'contracts') return infoStore.contracts.map(c => ({ name: c.name, no: c.no, status: c.status, meta: (c.signedBy || c.customerName) + ' · ¥' + formatCents(c.amtCents) + (c.fileUrl ? '' : ' · 待卷签'), tag: 'contract', id: c.id })).filter(r => matchKw(r.name, r.no));
  if (view.value === 'products') {
    let rows = infoStore.products.map(p => ({ name: p.name, no: p.no, cat: p.cat, status: p.stock < 50 ? '库存预警' : '库存充足', meta: p.spec + ' · ' + p.cat + ' · ¥' + p.price + '/' + p.unit, tag: 'product', id: p.id }));
    const tab = subTab.value;
    if (tab === 1) rows = rows.filter(r => r.cat === '防水材料');
    else if (tab === 2) rows = rows.filter(r => r.cat === '节能材料');
    else if (tab === 3) rows = rows.filter(r => r.cat === '装饰');
    return rows.filter(r => matchKw(r.name, r.no));
  }
  return [];
});

const subTabs = computed(() => {
  if (view.value === 'customers') return ['全部', '客户', '经销商', '已生效', '审批中'];
  if (view.value === 'products')  return ['全部', '防水材料', '节能材料', '辅材'];
  return null;
});
const subTab = ref(0);
const keyword = ref('');

function onCreate() {
  uni.showToast({ title: '新建 · ' + tabs.value.find(t => t.id === view.value)?.label, icon: 'none' });
}

function onPick(it: any) {
  if (view.value === 'customers') {
    uni.navigateTo({ url: '/pages/customer-detail/index?bp=' + encodeURIComponent(it.no) });
  } else if (view.value === 'projects') {
    uni.navigateTo({ url: '/pages/project-detail/index?id=' + encodeURIComponent(it.id || it.no) });
  } else if (view.value === 'contracts') {
    uni.navigateTo({ url: '/pages/contract-detail/index?id=' + encodeURIComponent(it.id || it.no) });
  } else if (view.value === 'products') {
    uni.navigateTo({ url: '/pages/product-detail/index?id=' + encodeURIComponent(it.id || it.no) });
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
      <text class="title">资讯</text>
      <view class="nav-action" @click="onCreate">
        <IconBox name="plus" :size="14" color="var(--c-accent)"/>
        <text>新建</text>
      </view>
    </view>

    <!-- 搜索 -->
    <view class="search">
      <view class="search-input">
        <IconBox name="search" :size="14" color="var(--c-mute)"/>
        <input v-model="keyword" class="search-text" placeholder="客商名称 / 项目 / 物料号" placeholder-class="ph" />
      </view>
    </view>

    <!-- 4 tab 统一描边 -->
    <view class="hub-switch">
      <view
        v-for="t in tabs"
        :key="t.id"
        class="tab-btn"
        :class="{ active: view === t.id }"
        @click="view = t.id"
      >
        <text>{{ t.label }}</text>
        <text class="num">{{ t.count }}</text>
      </view>
    </view>

    <view v-if="subTabs" class="sub-tabs">
      <view
        v-for="(t, i) in subTabs"
        :key="i"
        class="sub-tab"
        :class="{ active: i === subTab }"
        @click="subTab = i"
      >{{ t }}</view>
    </view>

    <!-- 列表 · 档案卡 -->
    <view class="card-list">
      <view
        v-for="it in list"
        :key="it.no"
        class="dossier"
        :style="{ '--tag-color': tagOf(it.tag).color }"
        @click="onPick(it)"
      >
        <view class="dossier-tab"/>
        <view class="dossier-body">
          <view class="dossier-top">
            <text class="dossier-name">{{ it.name }}</text>
            <view class="dossier-status" :style="{ '--status-color': statusColor(it.status) }">
              <view class="status-dot"/>
              <text>{{ it.status }}</text>
            </view>
          </view>
          <view class="dossier-mid">
            <text class="dossier-no">{{ it.no }}</text>
          </view>
          <view class="dossier-foot">
            <text class="dossier-meta">{{ it.meta }}</text>
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

.titlebar { border-bottom: 1px solid var(--c-line-soft); }
.titlebar .nav-action {
  position: absolute; right: 12px;
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: var(--r-pill);
  background: var(--c-accent-soft); color: var(--c-accent);
  font-family: var(--ff-body); font-size: 12px; font-weight: 600;
}

/* 搜索 */
.search { padding: 10px 16px 8px; }
.search-input {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft); border-radius: var(--r-md);
}
.ph { font-size: 13px; color: var(--c-mute); }
.search-text { flex: 1; font-size: 13px; color: var(--c-ink); background: transparent; border: 0; padding: 0; }

/* 主 tab 统一描边 */
.hub-switch {
  display: flex;
  padding: 6px 16px 0;
  gap: 6px;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-ink);
  background: transparent;
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
}
.tab-btn.active {
  background: var(--c-accent-soft);
  border-color: var(--c-accent);
  color: var(--c-accent);
}
.tab-btn .num {
  font-family: var(--ff-mono);
  font-size: 10px;
  padding: 1px 5px;
  background: var(--c-paper);
  border-radius: var(--r-pill);
  color: var(--c-mute);
}
.tab-btn.active .num {
  background: var(--c-accent);
  color: #fff;
}

/* sub tab 圆点 */
.sub-tabs {
  display: flex;
  gap: 6px;
  padding: 8px 16px 0;
  overflow-x: auto;
}
.sub-tab {
  font-size: 12px;
  color: var(--c-mute);
  padding: 4px 10px;
  border-radius: var(--r-pill);
  white-space: nowrap;
}
.sub-tab.active { background: var(--c-ink); color: var(--c-paper); }

/* ============ 档案卡列表 ============ */
.card-list {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dossier {
  display: flex;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  position: relative;
  overflow: hidden;
  min-height: 86px;
  transition: transform 0.1s;
}
.dossier:active { transform: scale(0.99); background: var(--c-paper); }
.dossier-tab {
  width: 4px;
  background: var(--tag-color, var(--c-accent));
  flex-shrink: 0;
}
.dossier-body {
  flex: 1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.dossier-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.dossier-name {
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
.dossier-no { letter-spacing: 0.04em; }
.dossier-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
}
.dossier-meta {
  font-size: 11px;
  color: var(--c-mute);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dossier-arrow {
  display: flex;
  align-items: center;
  opacity: 0.5;
}
</style>