<template>
  <view class="fab" @click="goAi">
    <view class="fab-inner">
      <text class="fab-label">AI</text>
    </view>
  </view>
</template>

<script setup lang="ts">
function goAi() {
  uni.switchTab({ url: '/pages/ai/index' });
}
</script>

<style scoped>
.fab {
  position: fixed;
  bottom: 72px;
  right: 18px;
  width: 56px;
  height: 56px;
  background: var(--c-accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(232, 84, 44, 0.35), 0 2px 4px rgba(0, 0, 0, 0.18);
  z-index: 99;
  border: 3px solid var(--c-paper-2);
  box-sizing: border-box;
}
.fab:active {
  transform: scale(0.96);
}
.fab-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: var(--ff-display);
  line-height: 1;
}
.fab-label {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
</style>