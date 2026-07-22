<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import FabAI from '../../components/FabAI/FabAI.vue';
import IconBox from '../../components/IconBox/IconBox.vue';
import { useMeStore } from '../../stores';
import { formatCents } from '../../utils/amount';
import { logout } from '../../api/client';

const meStore = useMeStore();
onMounted(() => { void meStore.load(); });
const profile = computed(() => {
  const m = meStore.metrics;
  const gmv = m ? formatCents(m.gmvCents) : '—';
  const orderCount = m ? String(m.orderCount ?? 0) : '—';
  const completion = m && m.completion > 0 ? (m.completion * 100).toFixed(0) + '%' : '待对接';
  return {
    name: meStore.profile?.displayName || '加载中',
    role: meStore.profile?.role || '',
    avatar: meStore.profile?.avatar || 'U',
    metrics: [
      { label: '本月 GMV', value: gmv },
      { label: '新增订单', value: orderCount },
      { label: '完成率',   value: completion },
    ],
  };
});

const groups = [
  {
    title: '我的工作',
    items: [
      { id: 'profile',  name: '个人资料',     desc: '姓名 / 职务 / 手机',       icon: 'user',     color: 'var(--c-blue)' },
      { id: 'approval', name: '我的审批',     desc: '待审批 2 · 已审批 12 · 我发起 5', icon: 'approval', color: 'var(--c-accent)', badge: '2' },
      { id: 'follow',   name: '跟进任务',     desc: '客户跟进记录',             icon: 'follow',   color: 'var(--c-green)' },
      { id: 'report',   name: '业绩报表',     desc: '个人 / 团队 / 区域',       icon: 'report',   color: 'var(--c-gold)' },
    ],
  },
  {
    title: '系统',
    items: [
      { id: 'settings', name: '设置',         desc: '通知 / 密码 / 关于',       icon: 'settings', color: 'var(--c-steel)' },
      { id: 'help',     name: '帮助与反馈',   desc: '使用文档 + FAQ',           icon: 'help',     color: 'var(--c-blue)' },
      { id: 'sync',     name: '数据同步',     desc: 'SAP / OA / 快达',          icon: 'sync',     color: 'var(--c-green)' },
    ],
  },
  {
    title: '管理',
    items: [
      { id: 'team',     name: '团队管理',     desc: '同事 / 下属',              icon: 'team',     color: 'var(--c-accent)' },
      { id: 'calendar', name: '日历',         desc: '订单 / 跟进 / 审批日志',   icon: 'calendar', color: 'var(--c-gold)' },
    ],
  },
];

function onItem(id: string) {
  if (id === 'settings') {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  uni.showToast({ title: id + ' · 即将接入', icon: 'none' });
}

async function onLogout() {
  await logout();
  uni.reLaunch({ url: '/pages/login/index' });
}
</script>

<template>
  <view class="page">
    <view class="notch">
      <text>09:41</text>
      <text><text class="dot" />ONLINE</text>
      <text>v3.1</text>
    </view>

    <!-- 个人档案封面 -->
    <view class="cover">
      <view class="cover-tab"/>
      <view class="cover-row">
        <view class="cover-avatar">{{ profile.avatar }}</view>
        <view class="cover-info">
          <text class="cover-name">{{ profile.name }}</text>
          <text class="cover-role">{{ profile.role }}</text>
        </view>
        <view class="cover-edit" @click="onItem('settings')">
          <IconBox name="settings" :size="16" color="var(--c-mute)"/>
        </view>
      </view>
      <view class="cover-metrics">
        <view v-for="m in profile.metrics" :key="m.label" class="cm">
          <text class="cm-v">{{ m.value }}</text>
          <text class="cm-l">{{ m.label }}</text>
        </view>
      </view>
    </view>

    <!-- 分组档案卡 -->
    <view v-for="g in groups" :key="g.title" class="group">
      <view class="group-title">
        <view class="gt-mark"/>
        <text>{{ g.title }}</text>
      </view>
      <view class="group-list">
        <view
          v-for="u in g.items"
          :key="u.id"
          class="util-row"
          :style="{ '--util-color': u.color }"
          @click="onItem(u.id)"
        >
          <view class="util-tab"/>
          <view class="util-body">
            <text class="util-name">{{ u.name }}</text>
            <text class="util-desc">{{ u.desc }}</text>
          </view>
          <view v-if="u.badge" class="util-badge">{{ u.badge }}</view>
          <view class="util-arrow"><IconBox name="chevron" :size="14" color="var(--c-mute)"/></view>
        </view>
      </view>
    </view>

    <view class="logout-bar" @click="onLogout">退出登录</view>
  </view>
    <FabAI />
  </template>

<style scoped>
.page { background: var(--c-paper); padding-bottom: 90px; }

/* ============ 个人档案封面 ============ */
.cover {
  margin: 12px 16px 0;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  position: relative;
  overflow: hidden;
}
.cover-tab {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--c-accent);
}
.cover-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 16px 12px;
}
.cover-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--c-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ff-display);
  font-weight: 700;
  font-size: 18px;
  color: #fff;
  flex-shrink: 0;
}
.cover-info { flex: 1; min-width: 0; }
.cover-name {
  font-family: var(--ff-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--c-ink);
  letter-spacing: -0.005em;
}
.cover-role {
  font-size: 12px;
  color: var(--c-mute);
  margin-top: 2px;
  font-family: var(--ff-mono);
  letter-spacing: 0.04em;
  display: block;
}
.cover-edit {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-metrics {
  display: flex;
  padding: 12px 16px 14px;
  border-top: 1px dashed var(--c-line-soft);
  margin: 0 16px 0;
  width: calc(100% - 32px);
}
.cm {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-right: 1px dashed var(--c-line-soft);
  padding: 0 8px;
}
.cm:first-child { padding-left: 0; }
.cm:last-child { border-right: none; padding-right: 0; }
.cm-v {
  font-family: var(--ff-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--c-ink);
  letter-spacing: -0.005em;
}
.cm-l { font-size: 10px; color: var(--c-mute); }

/* ============ 分组 ============ */
.group { margin-top: 14px; }
.group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px 8px;
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.gt-mark { width: 10px; height: 2px; background: var(--c-ink); }

/* ============ 工具项档案行 ============ */
.group-list {
  margin: 0 16px;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  overflow: hidden;
}
.util-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--c-line-soft);
  transition: transform 0.1s;
  position: relative;
}
.util-row:last-child { border-bottom: none; }
.util-row:active { background: var(--c-paper); }
.util-tab {
  width: 4px;
  background: var(--util-color, var(--c-accent));
  flex-shrink: 0;
}
.util-body {
  flex: 1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.util-name {
  font-family: var(--ff-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--c-ink);
}
.util-desc {
  font-size: 11px;
  color: var(--c-mute);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.util-badge {
  font-family: var(--ff-mono);
  font-size: 10px;
  font-weight: 700;
  background: var(--c-accent);
  color: #fff;
  padding: 1px 6px;
  border-radius: var(--r-pill);
  min-width: 16px;
  text-align: center;
  align-self: center;
  flex-shrink: 0;
}
.util-arrow {
  display: flex;
  align-items: center;
  padding: 0 12px 0 4px;
  opacity: 0.5;
}

/* ============ 退出登录 ============ */
.logout-bar {
  margin: 14px 16px 0;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-md);
  text-align: center;
  padding: 11px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-danger);
}
.logout-bar:active { background: var(--c-paper); }
</style>