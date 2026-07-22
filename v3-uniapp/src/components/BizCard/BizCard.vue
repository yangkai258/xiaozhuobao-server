<script setup lang="ts">
defineProps<{
  mark: string;
  name: string;
  en: string;
  color: string;
  path: string;
}>();
const onTap = () => {
  uni.showToast({ title: '表单页尚未接入：' + name, icon: 'none' });
};
</script>

<template>
  <button class="biz" :style="{ '--biz-color': color }" @click="onTap">
    <span class="b-bar" />
    <span class="b-mark">{{ mark }}</span>
    <span class="b-name">{{ name }}</span>
    <span class="b-en">{{ en }}</span>
  </button>
</template>

<style scoped>
.biz {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 14px 4px 10px;
  background: var(--c-paper-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-card);
  cursor: pointer;
  text-align: center;
  font-family: inherit;
  color: inherit;
  overflow: hidden;
  min-width: 0;
  width: 100%;
}
.biz:active { border-color: var(--c-steel); }
.biz .b-bar {
  position: absolute;
  top: 0;
  left: 22%;
  right: 22%;
  height: 3px;
  background: var(--biz-color, var(--c-accent));
}
.biz .b-mark {
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: 20px;
  color: var(--c-ink);
  margin-top: 4px;
  letter-spacing: -0.02em;
  line-height: 1;
}
.biz .b-name {
  font-size: 10px;
  font-weight: 600;
  color: var(--c-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.biz .b-en {
  font-family: var(--ff-mono);
  font-size: 8px;
  color: var(--c-mute);
  letter-spacing: 0.1em;
  margin-top: -1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
