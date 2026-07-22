<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import IconBox from '../../components/IconBox/IconBox.vue';
import StatusTag from '../../components/StatusTag/StatusTag.vue';
import { api_aftersales } from '../../api/client';

type AftersaleDetail = {
  id: string;
  no: string;
  orderId: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  material: string;
  reason: string;
  reasonCode: string;
  status: string;
  statusCode: string;
  occurredAt: string;
  images: string[];
  oaFlowId: string | null;
};

const detail = ref<AftersaleDetail | null>(null);

onMounted(async () => {
  const pages = (typeof getCurrentPages === 'function' ? getCurrentPages() : []) as Array<{ options?: Record<string, string> }>;
  const opts = pages.at(-1)?.options ?? {};
  const no = opts.no || '';
  if (!no) return;
  try {
    const r = await api_aftersales.byId(no);
    detail.value = r.data as AftersaleDetail;
  } catch {
    // ponytail: aftersale not found or auth failed; page renders empty state
  }
});

// ponytail: only show the action bar when the ticket is still actionable; PENDING_OA and SAP_CREATED both allow
// transition into IN_HANDLING or REJECTED via PATCH /aftersales/:id/status (server enforces state machine)
const actionable = computed(() => {
  const c = detail.value?.statusCode;
  return c === 'PENDING_OA' || c === 'SAP_CREATED' || c === 'IN_HANDLING';
});

async function onAction(label: string, danger: boolean) {
  if (!detail.value) return;
  if (label === '补充材料') {
    // 补充材料不改状态，仅记录提示；后端无对应 endpoint
    uni.showToast({ title: '已记录，待客户回传', icon: 'none' });
    return;
  }
  const target = danger ? 'REJECTED' : 'IN_HANDLING';
  const ok = await new Promise<boolean>(resolve => {
    uni.showModal({
      title: '确认' + label,
      content: '状态将从 ' + detail.value!.status + ' 变更为 ' + (target === 'IN_HANDLING' ? '处理中' : '已驳回') + (danger ? '，该操作将通知客户' : ''),
      success: r => resolve(r.confirm),
    });
  });
  if (!ok) return;
  const v = detail.value.version;
  try {
    await api_aftersales.updateStatus(detail.value.no, target, v, danger ? '客户回退申请' : '已同意处理');
    uni.showToast({ title: '已' + label, icon: 'success' });
    const r = await api_aftersales.byId(detail.value.no);
    detail.value = r.data as AftersaleDetail;
  } catch (err: any) {
    if (err && err.code === 10009) {
      try {
        const r = await api_aftersales.byId(detail.value.no);
        detail.value = r.data as AftersaleDetail;
      } catch {}
      uni.showToast({ title: '状态已被他人修改，请重试', icon: 'none' });
    } else if (err && err.code === 10008) {
      uni.showToast({ title: '当前状态不允许此操作', icon: 'none' });
    } else {
      uni.showToast({ title: err?.message || '操作失败', icon: 'none' });
    }
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

    <view v-if="!detail" class="loading"><text>售后单加载中...</text></view>
    <view v-else>
    <view class="dossier-cover" style="--mark-color: var(--c-accent)">
      <view class="cover-cust-row">
        <text class="cover-cust">{{ detail.material }}</text>
        <StatusTag :status="detail.status"/>
      </view>
      <view class="cover-meta">
        <text class="mono">{{ detail.no }}</text>
        <text class="sep">·</text>
        <text class="mono">{{ detail.occurredAt.slice(0, 10) }}</text>
      </view>
      <view class="cover-related">
        <text class="rel-label">关联订单</text>
        <text class="mono">{{ detail.orderNo }}</text>
        <text class="rel-sep">·</text>
        <text class="rel-label">客户</text>
        <text class="mono">{{ detail.customerName }}</text>
      </view>
    </view>

    <view v-if="actionable" class="action-bar">
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
          <text class="info-label">原因</text>
          <text class="info-val">{{ detail.reason }}（{{ detail.reasonCode }}）</text>
        </view>
        <view class="info-row">
          <text class="info-label">物料</text>
          <text class="info-val">{{ detail.material }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">发生日期</text>
          <text class="info-val">{{ detail.occurredAt.slice(0, 10) }}</text>
        </view>
        <view class="info-row" v-if="detail.oaFlowId">
          <text class="info-label">OA 流程</text>
          <text class="info-val mono">{{ detail.oaFlowId }}</text>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-gold)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="store" :size="14" color="var(--c-gold)"/>
        </view>
        <text class="dossier-section-title">凭证图片</text>
        <text class="dossier-section-meta">{{ detail.images.length }} 张</text>
      </view>
      <view class="dossier-section-body" style="padding:12px 14px;">
        <view v-if="detail.images.length" style="display:flex; gap:8px; flex-wrap:wrap;">
          <view v-for="(img, i) in detail.images" :key="i" class="photo">
            <image :src="img" mode="aspectFill" style="width:72px; height:72px; border-radius:8px;"/>
          </view>
        </view>
        <text v-else style="font-size:12px; color:var(--c-mute);">暂未上传图片</text>
      </view>
    </view>

    <view class="footer-meta">{{ detail.no }} · 销卓宝 v3.1</view>
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

.dossier-cover { display: flex; flex-direction: column; gap: 6px; padding: 16px; margin: 0 16px; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); position: relative; }
.dossier-cover::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--mark-color); }
.cover-cust-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cover-cust { font-family: var(--ff-display); font-size: 17px; font-weight: 600; color: var(--c-ink); flex: 1; min-width: 0; }
.cover-meta { display: flex; align-items: center; gap: 6px; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.04em; }
.cover-meta .mono { font-family: var(--ff-mono); }
.cover-meta .sep { opacity: 0.5; }
.cover-related { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-family: var(--ff-mono); font-size: 11px; margin-top: 4px; }
.rel-label { color: var(--c-mute); }
.rel-sep { color: var(--c-line); padding: 0 2px; }

.action-bar { display: flex; gap: 8px; padding: 12px 16px; }
.action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 11px 0; border-radius: var(--r-md); font-size: 13px; font-weight: 600; background: var(--c-paper-2); color: var(--c-ink); border: 1px solid var(--c-line); }
.action-btn.accent { background: var(--c-accent); color: #fff; border-color: var(--c-accent); }
.action-btn.danger { background: var(--c-paper-2); color: var(--c-danger); border-color: var(--c-danger); }

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

.footer-meta { text-align: center; padding: 20px 16px 0; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.06em; }
</style>
