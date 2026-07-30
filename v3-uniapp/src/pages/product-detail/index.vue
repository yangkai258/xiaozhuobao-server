<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import IconBox from "../../components/IconBox/IconBox.vue";
import { api_products } from "../../api/client";
import { formatCents } from "../../utils/amount";

type ProductDetail = { id: string; no: string; name: string; spec: string; cat: string; stock: number; reservedQty: number; priceCents: string; unit: string; isActive: boolean; version: number; updatedAt: string };
const detail = ref<ProductDetail | null>(null);
const { loading, error, run: loadOne } = useRetry();
const available = computed(() => {
  if (!detail.value) return 0;
  return Math.max(0, detail.value.stock - detail.value.reservedQty);
});
onMounted(async () => {
  const pages = (typeof getCurrentPages === "function" ? getCurrentPages() : []) as Array<{ options?: Record<string, string> }>;
  const id = pages.at(-1)?.options?.id || pages.at(-1)?.options?.no || "";
  if (!id) { loading.value = false; return; }
  const r = await loadOne(() => api_products.byId(id).then(res => res.data as ProductDetail)); if (r) detail.value = r;
});
</script>

<template>
  <view class="page">
    <view class="notch"><text>09:41</text><text><text class="dot" />ONLINE</text><text>v3.1</text></view>
    <view class="titlebar">
      <view class="back" @click="uni.navigateBack()"><text>&lt;</text></view>
      <text class="title">商品详情</text>
    </view>
    <view v-if="loading"><text>商品档案加载中...</text></view>
    <view v-else-if="error"><text>{{ error }}</text><view @click="retryLoad">重试</view></view>
    <view v-else-if="!detail"><text>商品不存在或已下架</text></view>
    <view v-else>
      <view class="dossier-cover" style="--mark-color: var(--c-green)">
        <view class="cover-cust-row">
          <text class="cover-cust">{{ detail.name }}</text>
          <view class="status-pill">
            <view class="dot" :class="{ ok: available > 0, warn: available === 0 }"/>
            <text class="status-text">{{ available > 0 ? "库存充足" : "库存预警" }}</text>
          </view>
        </view>
        <text class="cover-no">{{ detail.no }} 路 {{ detail.cat }} 路 {{ detail.spec }}</text>
      </view>
      <view class="dossier-section">
        <view class="dossier-section-head">
          <view class="dossier-section-mark"><IconBox name="store" :size="14" color="var(--c-green)"/></view>
          <text class="dossier-section-title">商品概览</text>
        </view>
        <view class="dossier-section-body">
          <view class="irow"><text class="ilabel">商品编号</text><text class="ival mono">{{ detail.no }}</text></view>
          <view class="irow"><text class="ilabel">商品名称</text><text class="ival">{{ detail.name }}</text></view>
          <view class="irow"><text class="ilabel">规格</text><text class="ival">{{ detail.spec }}</text></view>
          <view class="irow"><text class="ilabel">分类</text><text class="ival">{{ detail.cat }}</text></view>
          <view class="irow"><text class="ilabel">单价</text><text class="ival mono">{{ formatCents(detail.priceCents) }} / {{ detail.unit }}</text></view>
          <view class="irow"><text class="ilabel">物理库存</text><text class="ival mono">{{ detail.stock }} {{ detail.unit }}</text></view>
          <view class="irow"><text class="ilabel">已预占</text><text class="ival mono">{{ detail.reservedQty }} {{ detail.unit }}</text></view>
          <view class="irow"><text class="ilabel">可售库存</text><text class="ival mono" style="color: var(--c-accent); font-weight: 700;">{{ available }} {{ detail.unit }}</text></view>
          <view class="irow"><text class="ilabel">状态</text><text class="ival">{{ detail.isActive ? "在售" : "下架" }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { background: var(--c-paper); min-height: 100vh; padding-bottom: 40px; }
.notch { display: flex; justify-content: space-between; padding: 8px 16px 4px; font-family: var(--ff-mono); font-size: 11px; color: var(--c-ink); }
.notch .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--c-ok); margin-right: 4px; }
.titlebar { position: relative; display: flex; align-items: center; justify-content: center; height: 44px; border-bottom: 1px solid var(--c-line-soft); }
.titlebar .back { position: absolute; left: 12px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: var(--c-ink); }
.titlebar .title { font-family: var(--ff-display); font-size: 16px; font-weight: 700; color: var(--c-ink); }
.loading { text-align: center; padding: 60px 16px; color: var(--c-mute); font-size: 13px; }
.dossier-cover { margin: 12px 16px 0; padding: 16px; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); position: relative; overflow: hidden; }
.dossier-cover::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--mark-color, var(--c-green)); }
.cover-cust-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cover-cust { font-family: var(--ff-display); font-size: 17px; font-weight: 600; color: var(--c-ink); flex: 1; min-width: 0; }
.cover-no { display: block; margin-top: 6px; font-family: var(--ff-mono); font-size: 11px; color: var(--c-mute); }
.status-pill { display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-pill); }
.status-pill .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c-mute); margin: 0; }
.status-pill .dot.ok { background: var(--c-ok); }
.status-pill .dot.warn { background: var(--c-warn); }
.status-text { font-family: var(--ff-mono); font-size: 11px; font-weight: 600; color: var(--c-ink); }
.dossier-section { margin: 12px 16px 0; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); overflow: hidden; }
.dossier-section-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px dashed var(--c-line-soft); }
.dossier-section-mark { width: 22px; height: 22px; border-radius: 6px; background: var(--c-paper); border: 1px solid var(--c-line-soft); display: flex; align-items: center; justify-content: center; }
.dossier-section-title { font-family: var(--ff-display); font-size: 14px; font-weight: 700; color: var(--c-ink); }
.dossier-section-body { padding: 8px 14px 14px; }
.irow { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--c-line-soft); }
.irow:last-child { border-bottom: 0; }
.ilabel { font-family: var(--ff-mono); font-size: 11px; color: var(--c-mute); letter-spacing: 0.04em; }
.ival { font-size: 13px; color: var(--c-ink); text-align: right; max-width: 60%; }
.mono { font-family: var(--ff-mono); }
</style>