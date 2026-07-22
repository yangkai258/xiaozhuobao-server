<template>
  <view class="iconbox" :style="{ width: size + 'px', height: size + 'px', color: color }">
    <view v-if="name === 'meeting'" class="ico">
      <view class="i-rect"/><view class="i-rect i-r2"/>
      <view class="i-line i-l1"/><view class="i-line i-l2"/>
      <view class="i-line i-l3"/><view class="i-line i-l4"/>
    </view>
    <view v-else-if="name === 'stock'" class="ico">
      <view class="i-stack"/><view class="i-stack i-s2"/><view class="i-stack i-s3"/>
    </view>
    <view v-else-if="name === 'ship'" class="ico"><view class="i-arrow"/></view>
    <view v-else-if="name === 'ad'" class="ico"><view class="i-megaphone"/></view>
    <view v-else-if="name === 'store'" class="ico"><view class="i-store"/></view>
    <view v-else-if="name === 'subsidy'" class="ico"><view class="i-coin"/></view>
    <view v-else-if="name === 'rental'" class="ico"><view class="i-key"/></view>
    <view v-else-if="name === 'complaint'" class="ico"><view class="i-bubble"/></view>
    <view v-else-if="name === 'user'" class="ico">
      <view class="i-user-head"/><view class="i-user-body"/>
    </view>
    <view v-else-if="name === 'approval'" class="ico">
      <view class="i-doc"/>
    </view>
    <view v-else-if="name === 'follow'" class="ico"><view class="i-flag"/></view>
    <view v-else-if="name === 'report'" class="ico">
      <view class="i-bar i-b1"/><view class="i-bar i-b2"/><view class="i-bar i-b3"/>
    </view>
    <view v-else-if="name === 'settings'" class="ico"><view class="i-gear"/></view>
    <view v-else-if="name === 'help'" class="ico"><view class="i-circle"/><text class="i-q">?</text></view>
    <view v-else-if="name === 'sync'" class="ico">
      <view class="i-sync-arrow a1"/><view class="i-sync-arrow a2"/>
    </view>
    <view v-else-if="name === 'team'" class="ico">
      <view class="i-team-c c1"/><view class="i-team-c c2"/>
    </view>
    <view v-else-if="name === 'calendar'" class="ico">
      <view class="i-cal"/><view class="i-cal-top"/><view class="i-cal-pole p1"/><view class="i-cal-pole p2"/>
    </view>
    <view v-else-if="name === 'chevron'" class="ico"><view class="i-chev"/></view>
    <view v-else-if="name === 'chev-down'" class="ico"><view class="i-chev-d"/></view>
    <view v-else-if="name === 'plus'" class="ico">
      <view class="i-plus-h"/><view class="i-plus-v"/>
    </view>
    <view v-else-if="name === 'search'" class="ico">
      <view class="i-search-c"/><view class="i-search-h"/>
    </view>
    <view v-else-if="name === 'phone'" class="ico"><view class="i-phone"/></view>
    <view v-else-if="name === 'location'" class="ico">
      <view class="i-pin-c"/><view class="i-pin-d"/>
    </view>
    <view v-else-if="name === 'clock'" class="ico">
      <view class="i-clock-c"/><view class="i-clock-h"/><view class="i-clock-m"/>
    </view>
    <view v-else-if="name === 'tag'" class="ico">
      <view class="i-tag"/><view class="i-tag-d"/>
    </view>
    <view v-else-if="name === 'spoke'" class="ico">
      <view class="i-spoke-c"/><view class="i-spoke-tl"/><view class="i-spoke-tr"/><view class="i-spoke-bl"/><view class="i-spoke-br"/>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number; color?: string }>(), { size: 18, color: 'currentColor' });
</script>

<style scoped>
.iconbox { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ico { width: 100%; height: 100%; position: relative; }

/* meeting 会议 */
.i-rect { position: absolute; left: 0; right: 50%; top: 18%; height: 22%; background: currentColor; border-radius: 1px; }
.i-r2 { left: 50%; right: 0; top: 56%; }
.i-line { position: absolute; left: 0; right: 50%; height: 2px; background: currentColor; opacity: 0.55; border-radius: 1px; }
.i-l1 { top: 50%; }
.i-l2 { top: 66%; }
.i-l3 { left: 50%; right: 0; top: 16%; height: 6px; opacity: 0.35; }
.i-l4 { left: 50%; right: 0; top: 86%; height: 6px; opacity: 0.35; }

/* stock 备货 - 三个堆叠 */
.i-stack { position: absolute; left: 12%; right: 12%; height: 16%; background: currentColor; border-radius: 1px; top: 22%; }
.i-s2 { top: 50%; opacity: 0.6; }
.i-s3 { top: 78%; opacity: 0.32; }

/* ship 发货 - 右箭头 */
.i-arrow { position: absolute; left: 14%; top: 42%; right: 18%; height: 16%; background: currentColor; border-radius: 1px; }
.i-arrow::after { content: ''; position: absolute; right: -2px; top: 50%; transform: translateY(-50%); border: 8px solid transparent; border-left-color: currentColor; border-right: 0; border-top-width: 6px; border-bottom-width: 6px; }

/* ad 广告 - 喇叭 */
.i-megaphone { position: absolute; left: 18%; top: 30%; width: 56%; height: 38%; background: currentColor; clip-path: polygon(0 30%, 80% 0, 100% 0, 100% 100%, 80% 100%, 0 70%); border-radius: 2px 4px 4px 2px; }
.i-megaphone::after { content: ''; position: absolute; right: 16%; top: -16%; width: 18%; height: 24%; background: currentColor; border-radius: 50%; }

/* store 店铺 */
.i-store { position: absolute; left: 12%; right: 12%; top: 32%; height: 56%; background: currentColor; border-radius: 0 0 1px 1px; }
.i-store::before { content: ''; position: absolute; left: -8%; right: -8%; top: -36%; height: 36%; background: currentColor; clip-path: polygon(0 100%, 12% 0, 88% 0, 100% 100%); }

/* subsidy 仓储补贴 - 硬币 */
.i-coin { position: absolute; left: 18%; right: 18%; top: 18%; bottom: 18%; background: currentColor; border-radius: 50%; }
.i-coin::after { content: ''; position: absolute; left: 30%; right: 30%; top: 38%; height: 24%; background: var(--c-paper); border-radius: 50%; }

/* rental 设备租赁 - 钥匙 */
.i-key { position: absolute; left: 14%; top: 38%; width: 24%; height: 24%; background: currentColor; border-radius: 50%; }
.i-key::after { content: ''; position: absolute; left: 36%; top: 46%; width: 50%; height: 8%; background: currentColor; border-radius: 1px; }

/* complaint 外部投诉 - 对话泡 */
.i-bubble { position: absolute; left: 8%; top: 18%; width: 76%; height: 60%; background: currentColor; border-radius: 5px; }
.i-bubble::after { content: ''; position: absolute; left: 18%; bottom: -22%; border: 8px solid transparent; border-top-color: currentColor; border-bottom: 0; border-right: 0; }

/* user 用户头像 */
.i-user-head { position: absolute; left: 30%; right: 30%; top: 8%; height: 36%; background: currentColor; border-radius: 50%; }
.i-user-body { position: absolute; left: 14%; right: 14%; top: 56%; height: 40%; background: currentColor; border-radius: 50% 50% 0 0; }

/* approval 审批 - 文档 */
.i-doc { position: absolute; left: 14%; right: 14%; top: 12%; bottom: 12%; background: currentColor; border-radius: 2px; }
.i-doc::before { content: ''; position: absolute; left: 20%; right: 20%; top: 24%; height: 6%; background: var(--c-paper); border-radius: 1px; opacity: 0.5; }
.i-doc::after { content: ''; position: absolute; left: 20%; right: 44%; top: 42%; height: 6%; background: var(--c-paper); border-radius: 1px; opacity: 0.5; }

/* follow 跟进 - 旗 */
.i-flag { position: absolute; left: 30%; top: 12%; width: 6%; height: 76%; background: currentColor; }
.i-flag::before { content: ''; position: absolute; left: 6%; top: 0; width: 60%; height: 56%; background: currentColor; clip-path: polygon(0 0, 100% 30%, 0 60%); }

/* report 报表 - 三柱 */
.i-bar { position: absolute; bottom: 12%; width: 16%; background: currentColor; border-radius: 1px 1px 0 0; }
.i-b1 { left: 14%; height: 36%; }
.i-b2 { left: 42%; height: 60%; }
.i-b3 { left: 70%; height: 46%; }

/* settings 设置 - 齿轮 */
.i-gear { position: absolute; left: 12%; right: 12%; top: 12%; bottom: 12%; background: currentColor; clip-path: polygon(50% 0, 60% 6%, 75% 0, 80% 12%, 94% 20%, 94% 35%, 100% 50%, 94% 65%, 94% 80%, 80% 88%, 75% 100%, 60% 94%, 50% 100%, 40% 94%, 25% 100%, 20% 88%, 6% 80%, 6% 65%, 0 50%, 6% 35%, 6% 20%, 20% 12%, 25% 0, 40% 6%); border-radius: 2px; }
.i-gear::before { content: ''; position: absolute; left: 30%; right: 30%; top: 30%; bottom: 30%; background: var(--c-paper); border-radius: 50%; }

/* help 帮助 - 圆圈+问号 */
.i-circle { position: absolute; inset: 0; background: currentColor; border-radius: 50%; }
.i-q { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; color: var(--c-paper); font-family: var(--ff-display); font-weight: 700; font-size: 12px; line-height: 1; }

/* sync 数据同步 */
.i-sync-arrow { position: absolute; left: 14%; right: 14%; height: 8%; background: currentColor; border-radius: 1px; }
.i-sync-arrow.a1 { top: 28%; }
.i-sync-arrow.a2 { top: 64%; transform: scaleY(-1); }

/* team 团队 */
.i-team-c { position: absolute; width: 46%; height: 60%; top: 14%; }
.i-team-c.c1 { left: 6%; }
.i-team-c.c2 { right: 6%; }
.i-team-c::before { content: ''; position: absolute; left: 28%; right: 28%; top: 0; height: 50%; background: currentColor; border-radius: 50%; }
.i-team-c::after { content: ''; position: absolute; left: 8%; right: 8%; top: 48%; height: 60%; background: currentColor; border-radius: 50% 50% 0 0; }

/* calendar 日历 */
.i-cal { position: absolute; left: 8%; right: 8%; top: 22%; bottom: 8%; background: currentColor; border-radius: 2px; }
.i-cal-top { position: absolute; left: 8%; right: 8%; top: 8%; height: 16%; background: currentColor; border-radius: 2px 2px 0 0; }
.i-cal-pole { position: absolute; top: 0; width: 8%; height: 30%; background: currentColor; border-radius: 1px; }
.i-cal-pole.p1 { left: 28%; }
.i-cal-pole.p2 { right: 28%; }

/* chevron 右箭头 */
.i-chev { position: absolute; left: 28%; top: 28%; width: 44%; height: 44%; border-right: 2px solid currentColor; border-top: 2px solid currentColor; transform: rotate(45deg); border-top-right-radius: 1px; }

/* chev-down */
.i-chev-d { position: absolute; left: 28%; top: 50%; width: 44%; height: 44%; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: translateY(-50%) rotate(45deg); border-bottom-right-radius: 1px; }

/* plus 加号 */
.i-plus-h, .i-plus-v { position: absolute; background: currentColor; border-radius: 1px; }
.i-plus-h { left: 16%; right: 16%; top: 46%; height: 8%; }
.i-plus-v { top: 16%; bottom: 16%; left: 46%; width: 8%; }

/* search 搜索 */
.i-search-c { position: absolute; left: 8%; top: 8%; width: 60%; height: 60%; border: 2px solid currentColor; border-radius: 50%; background: transparent; box-sizing: border-box; }
.i-search-h { position: absolute; right: 8%; bottom: 12%; width: 30%; height: 2px; background: currentColor; transform: rotate(45deg); border-radius: 1px; }

/* phone 电话 */
.i-phone { position: absolute; left: 22%; top: 12%; width: 56%; height: 76%; border: 2px solid currentColor; border-radius: 4px; background: transparent; box-sizing: border-box; }
.i-phone::before { content: ''; position: absolute; left: 35%; right: 35%; top: 80%; height: 4px; background: currentColor; border-radius: 1px; }

/* location 位置 */
.i-pin-c { position: absolute; left: 28%; right: 28%; top: 6%; height: 60%; background: currentColor; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); }
.i-pin-d { position: absolute; left: 38%; right: 38%; top: 22%; height: 28%; background: var(--c-paper); border-radius: 50%; }

/* clock 时钟 */
.i-clock-c { position: absolute; inset: 8%; background: transparent; border: 2px solid currentColor; border-radius: 50%; box-sizing: border-box; }
.i-clock-h { position: absolute; left: 49%; top: 24%; width: 2px; height: 28%; background: currentColor; transform-origin: bottom center; }
.i-clock-m { position: absolute; left: 49%; top: 24%; width: 2px; height: 36%; background: currentColor; transform-origin: bottom center; transform: rotate(60deg); }

/* tag 标签 */
.i-tag { position: absolute; left: 12%; right: 12%; top: 18%; height: 56%; background: currentColor; border-radius: 1px 4px 4px 1px; }
.i-tag::before { content: ''; position: absolute; left: 8%; top: 30%; width: 10%; height: 10%; background: var(--c-paper); border-radius: 50%; }
.i-tag-d { position: absolute; right: 6%; top: 50%; transform: translateY(-50%); border: 6px solid transparent; border-right: 0; border-left-color: currentColor; border-top-width: 8px; border-bottom-width: 8px; }

/* spoke 圆环中心+射线 */
.i-spoke-c { position: absolute; left: 30%; right: 30%; top: 30%; bottom: 30%; background: currentColor; border-radius: 50%; }
.i-spoke-tl, .i-spoke-tr, .i-spoke-bl, .i-spoke-br { position: absolute; width: 24%; height: 4%; background: currentColor; border-radius: 1px; }
.i-spoke-tl { left: 10%; top: 18%; transform: rotate(-45deg); transform-origin: right center; }
.i-spoke-tr { right: 10%; top: 18%; transform: rotate(45deg); transform-origin: left center; }
.i-spoke-bl { left: 10%; bottom: 18%; transform: rotate(45deg); transform-origin: right center; }
.i-spoke-br { right: 10%; bottom: 18%; transform: rotate(-45deg); transform-origin: left center; }
</style>