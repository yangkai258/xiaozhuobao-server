<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import IconBox from '../../components/IconBox/IconBox.vue';
import { api_biz } from '../../api/client';
import { useInfoStore } from '../../stores';

const status = ref('DRAFT');

const infoStore = useInfoStore();
const customerId = ref('');
onMounted(() => { void infoStore.load().then(() => { customerId.value = infoStore.customers[0]?.id || ''; }); });

const form = ref({
    "name": "夏季防水促销",
    "channel": "抖音",
    "period": "2026-07-22 ~ 2026-08-22",
    "amount": "50000",
    "audience": "工程承包商",
    "frequency": "日 3 次",
    "content": "夏季防水材料促销",
    "attachment": "待上传"
  });

const sections = [
      {
        "color": "--c-gold",
        "icon": "tag",
        "title": "基础信息",
        "fields": [
          {
            "key": "name",
            "label": "广告名称",
            "type": "text"
          },
          {
            "key": "channel",
            "label": "投放渠道",
            "type": "picker"
          },
          {
            "key": "period",
            "label": "投放周期",
            "type": "picker"
          }
        ]
      },
      {
        "color": "--c-accent",
        "icon": "report",
        "title": "预算与受众",
        "fields": [
          {
            "key": "amount",
            "label": "预算金额",
            "type": "text"
          },
          {
            "key": "audience",
            "label": "人群标签",
            "type": "picker"
          },
          {
            "key": "frequency",
            "label": "曝光频次",
            "type": "picker"
          }
        ]
      },
      {
        "color": "--c-blue",
        "icon": "edit",
        "title": "内容与附件",
        "fields": [
          {
            "key": "content",
            "label": "创意说明",
            "type": "textarea",
            "placeholder": "描述物料内容、卖点"
          },
          {
            "key": "attachment",
            "label": "附件凭证",
            "type": "picker"
          }
        ]
      }
    ];

const steps = ["DRAFT","SUBMITTED","APPROVED"];
const stepLabels = ["草稿","已提交","已通过"];
const currentStepIndex = computed(() => steps.indexOf(status.value));

async function onSubmit() {
  if (status.value !== 'DRAFT') return;
  if (!customerId.value) { uni.showToast({ title: '客户未加载', icon: 'none' }); return; }
  const payload: any = { customerId: customerId.value, channel: form.value.channel, budgetCents: String(Math.round((parseFloat(form.value.amount) || 0) * 100)) };
  const m = (form.value.period || '').match(/(\d{4}-\d{2}-\d{2})\s*[~\-]\s*(\d{4}-\d{2}-\d{2})/);
  if (m) { payload.periodStart = m[1]; payload.periodEnd = m[2]; } else { uni.showToast({ title: '日期格式不对', icon: 'none' }); return; }
  if (form.value.content) payload.material = form.value.content;
  if (form.value.attachment && form.value.attachment !== '待上传') payload.remark = form.value.attachment;
  const confirm = await new Promise<boolean>(r => uni.showModal({ title: '确认提交 广告投放申请?', content: '提交后将进入审批流程', success: s => r(s.confirm) }));
  if (!confirm) return;
  try {
    await api_biz.create('ADVERT', payload);
    status.value = 'SUBMITTED';
    uni.showToast({ title: '已提交审批', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 800);
  } catch (e: any) {
    uni.showToast({ title: e?.msg || '提交失败', icon: 'none' });
  }
}

function onSave() {
  uni.showToast({ title: '草稿已保存', icon: 'success' });
}

function onAction(label) {
  uni.showToast({ title: '已' + label, icon: 'success' });
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
      <text class="title">广告投放申请</text>
      <view class="save-btn" @click="onSave"><text>草稿</text></view>
    </view>

    <view class="dossier-cover" style="--mark-color: var(--c-gold)">
      <view class="cover-cust-row">
        <text class="cover-cust">广告投放申请</text>
        <view class="status-pill">
          <view class="dot"/>
          <text class="status-text">{{ status }}</text>
        </view>
      </view>
      <view v-if="coverMetaVisible" class="cover-meta">
        <text class="mono">渠道 待选</text>
        <text class="sep" v-if="true">·</text>
        <text class="mono" v-if="true">¥ —</text>
      </view>
    </view>

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

    <view
      v-for="(sec, si) in sections"
      :key="si"
      class="dossier-section"
      :style="{ '--mark-color': 'var(' + sec.color + ')' }"
    >
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox :name="sec.icon" :size="14" :color="'var(' + sec.color + ')'"/>
        </view>
        <text class="dossier-section-title">{{ sec.title }}</text>
      </view>
      <view class="dossier-section-body">
        <view v-for="(f, fi) in sec.fields" :key="fi" class="info-row">
          <text class="info-label">{{ f.label }}</text>
          <view v-if="f.type === 'picker'" class="picker">
            <text>{{ form[f.key] }}</text>
            <IconBox name="chev-down" :size="12" color="var(--c-mute)"/>
          </view>
          <view v-else-if="f.type === 'qty'" class="qty-row">
            <view class="qty-btn">-</view>
            <input class="qty-input" v-model="form[f.key]"/>
            <view class="qty-btn">+</view>
            <text class="unit">{{ f.unit }}</text>
          </view>
          <textarea
            v-else-if="f.type === 'textarea'"
            class="info-val"
            style="width:100%; padding:8px 10px; background:var(--c-paper); border-radius:6px; font-size:12px; min-height:64px; box-sizing:border-box; border:1px solid var(--c-line-soft);"
            v-model="form[f.key]"
            :placeholder="f.placeholder || ''"
          />
          <view v-else-if="f.type === 'chip-group'" style="flex:1;">
            <view style="display:flex; flex-wrap:wrap; gap:6px;">
              <view
                v-for="opt in f.options"
                :key="opt"
                class="chip"
                :class="{ active: form[f.key] === opt }"
                @click="form[f.key] = opt"
              >{{ opt }}</view>
            </view>
          </view>
          <text v-else class="info-val">{{ form[f.key] }}</text>
        </view>
      </view>
    </view>

    <view class="dossier-section" style="--mark-color: var(--c-gold)">
      <view class="dossier-section-head">
        <view class="dossier-section-mark">
          <IconBox name="approval" :size="14" color="var(--c-gold)"/>
        </view>
        <text class="dossier-section-title">操作</text>
      </view>
      <view class="dossier-section-body">
        <view class="action-bar">
          <view class="action-btn accent" @click="onSubmit">
            <text>提交审批</text>
          </view>
          <view class="action-btn is-locked" v-if="status !== 'DRAFT'">
            <text>已提交</text>
          </view>
          <view class="action-btn danger" @click="onAction('撤回')">
            <text>撤回</text>
          </view>
        </view>
      </view>
    </view>

    <view class="footer-meta">{{ status }} · v3.1 · 销卓宝</view>
  </view>
</template>

<style scoped>
.page { background: var(--c-paper); padding-bottom: 32px; }

.titlebar .back {
  position: absolute; left: 12px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: var(--c-ink);
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
.cover-meta { display: flex; align-items: center; gap: 6px; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.04em; }
.cover-meta .mono { font-family: var(--ff-mono); }
.cover-meta .sep { opacity: 0.5; }

.status-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-pill);
}
.status-pill .dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--c-accent);
}
.status-text { font-family: var(--ff-mono); font-size: 11px; font-weight: 600; color: var(--c-ink); letter-spacing: 0.04em; }

.stepper {
  display: flex; align-items: flex-start;
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
  font-family: var(--ff-mono); font-size: 11px; color: var(--c-mute);
}
.step.done .step-dot { background: var(--c-ok); border-color: var(--c-ok); color: #fff; }
.step.active .step-dot { background: var(--c-accent); border-color: var(--c-accent); color: #fff; }
.step-label { font-size: 10px; color: var(--c-mute); margin-top: 6px; letter-spacing: 0.04em; }
.step.done .step-label, .step.active .step-label { color: var(--c-ink); font-weight: 600; }
.step-line { position: absolute; left: 60%; right: -40%; top: 13px; height: 1px; background: var(--c-line); }
.step-line.done { background: var(--c-ok); }
.tick { font-size: 14px; font-weight: 700; }

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
  border: 1px solid var(--c-line-soft);
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
  color: var(--c-ink);
}
.unit { font-size: 12px; color: var(--c-mute); margin-left: 4px; }

.chip {
  padding: 5px 12px;
  font-size: 12px;
  color: var(--c-mute);
  background: var(--c-paper);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-pill);
}
.chip.active { background: var(--c-accent-soft); color: var(--c-accent); border-color: var(--c-accent); font-weight: 600; }

.footer-meta { text-align: center; padding: 20px 16px 0; font-family: var(--ff-mono); font-size: 10px; color: var(--c-mute); letter-spacing: 0.06em; }
</style>
