<script setup lang="ts">
import { ref, onMounted } from "vue";
import IconBox from "../../components/IconBox/IconBox.vue";
import StatusTag from "../../components/StatusTag/StatusTag.vue";
import { api_contracts } from "../../api/client";
import { formatCents } from "../../utils/amount";

type ContractDetail = { id: string; no: string; name: string; customerId: string; customerName: string; projectId: string | null; projectName: string | null; signedBy: string | null; status: string; amtCents: string; fileUrl: string | null; version: number; createdAt: string; updatedAt: string };
const detail = ref<ContractDetail | null>(null);
const loading = ref(true);
onMounted(async () => {
  const pages = (typeof getCurrentPages === "function" ? getCurrentPages() : []) as Array<{ options?: Record<string, string> }>;
  const id = pages.at(-1)?.options?.id || pages.at(-1)?.options?.no || "";
  if (!id) { loading.value = false; return; }
  try { const r = await api_contracts.byId(id); detail.value = r.data as ContractDetail; } catch { /* empty state */ } finally { loading.value = false; }
});
</script>

<template>
  <view class="page">
    <view class="notch"><text>09:41</text><text><text class="dot" />ONLINE</text><text>v3.1</text></view>
    <view class="titlebar">
      <view class="back" @click="uni.navigateBack()"><text>&lt;</text></view>
      <text class="title">合同详情</text>
    </view>
    <view v-if="loading" class="loading"><text>合同档案加载中...</text></view>
    <view v-else-if="!detail" class="loading"><text>合同不存在或已删除</text></view>
    <view v-else>
      <view class="dossier-cover" style="--mark-color: var(--c-gold)">
        <view class="cover-cust-row">
          <text class="cover-cust">{{ detail.name }}</text>
          <StatusTag :status="detail.status"/>
        </view>
        <text class="cover-no">{{ detail.no }} 路 {{ detail.customerName }}</text>
      </view>
      <view class="dossier-section">
        <view class="dossier-section-head">
          <view class="dossier-section-mark"><IconBox name="tag" :size="14" color="var(--c-gold)"/></view>
          <text class="dossier-section-title">合同概览</text>
        </view>
        <view class="dossier-section-body">
          <view class="irow"><text class="ilabel">合同编号</text><text class="ival mono">{{ detail.no }}</text></view>
          <view class="irow"><text class="ilabel">合同名称</text><text class="ival">{{ detail.name }}</text></view>
          <view class="irow"><text class="ilabel">关联客户</text><text class="ival">{{ detail.customerName }}</text></view>
          <view class="irow"><text class="ilabel">关联项目</text><text class="ival">{{ detail.projectName || "—" }}</text></view>
          <view class="irow"><text class="ilabel">签约方</text><text class="ival">{{ detail.signedBy || "—" }}</text></view>
          <view class="irow"><text class="ilabel">合同金额</text><text class="ival mono">{{ formatCents(detail.amtCents) }}</text></view>
          <view class="irow"><text class="ilabel">合同状态</text><text class="ival">{{ detail.status }}</text></view>
          <view class="irow"><text class="ilabel">附件</text><text class="ival">{{ detail.fileUrl ? "已上传" : "待上传" }}</text></view>
          <view class="irow"><text class="ilabel">创建时间</text><text class="ival mono">{{ detail.createdAt.slice(0, 10) }}</text></view>
          <view class="irow"><text class="ilabel">更新时间</text><text class="ival mono">{{ detail.updatedAt.slice(0, 10) }}</text></view>
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
.dossier-cover::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--mark-color, var(--c-gold)); }
.cover-cust-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cover-cust { font-family: var(--ff-display); font-size: 17px; font-weight: 600; color: var(--c-ink); flex: 1; min-width: 0; }
.cover-no { display: block; margin-top: 6px; font-family: var(--ff-mono); font-size: 11px; color: var(--c-mute); }
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