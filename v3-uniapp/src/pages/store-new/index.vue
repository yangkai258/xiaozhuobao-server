<script setup lang="ts">
import { ref, computed } from 'vue';
import IconBox from '../../components/IconBox/IconBox.vue';

const status = ref('DRAFT');

const form = ref({
    "name": "上海建工建材 · 张江店",
    "addr": "浦东新区张江高科园区",
    "type": "加盟",
    "area": "120 ㎡",
    "buildAmt": "120000",
    "equipAmt": "80000",
    "totalAmt": "200000",
    "invoice": "待上传",
    "note": "装修期 60 天"
  });

const sections = [
      {
        "color": "--c-blue",
        "icon": "store",
        "title": "门店信息",
        "fields": [
          {
            "key": "name",
            "label": "门店名称",
            "type": "text"
          },
          {
            "key": "addr",
            "label": "地址",
            "type": "text"
          },
          {
            "key": "type",
            "label": "门店类型",
            "type": "chip-group",
            "options": [
              "直营",
              "加盟"
            ]
          },
          {
            "key": "area",
            "label": "面积",
            "type": "text"
          }
        ]
      },
      {
        "color": "--c-gold",
        "icon": "report",
        "title": "预算明细",
        "fields": [
          {
            "key": "buildAmt",
            "label": "装修预算",
            "type": "text"
          },
          {
            "key": "equipAmt",
            "label": "设备预算",
            "type": "text"
          },
          {
            "key": "totalAmt",
            "label": "总预算",
            "type": "text"
          }
        ]
      },
      {
        "color": "--c-green",
        "icon": "edit",
        "title": "凭证与说明",
        "fields": [
          {
            "key": "invoice",
            "label": "发票/合同",
            "type": "picker"
          },
          {
            "key": "note",
            "label": "说明",
            "type": "textarea",
            "placeholder": "建设周期 / 特殊说明"
          }
        ]
      }
    ];

const steps = ["DRAFT","SUBMITTED","APPROVED","PAID"];
const stepLabels = ["草稿","已提交","已通过","已核销"];
const currentStepIndex = computed(() => steps.indexOf(status.value));

function onSubmit() {
  if (status.value !== 'DRAFT') return;
  uni.showModal({
    title: '确认提交 建店核销申请?',
    content: '提交后将进入审批流程',
    success: function(res) {
      if (res.confirm) {
        status.value = 'SUBMITTED';
        uni.showToast({ title: '已提交审批', icon: 'success' });
      }
    },
  });
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
      <text class="title">建店核销申请</text>
      <view class="save-btn" @click="onSave"><text>草稿</text></view>
    </view>

    <view class="dossier-cover" style="--mark-color: var(--c-blue)">
      <view class="cover-cust-row">
        <text class="cover-cust">建店核销申请</text>
        <view class="status-pill">
          <view class="dot"/>
          <text class="status-text">{{ status }}</text>
        </view>
      </view>
      <view v-if="coverMetaVisible" class="cover-meta">
        <text class="mono">上海建工 张江店</text>
        <text class="sep" v-if="true">·</text>
        <text class="mono" v-if="true">¥ 200000</text>
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
