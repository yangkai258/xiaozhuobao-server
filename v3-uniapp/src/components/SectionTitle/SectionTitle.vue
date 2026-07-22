<script setup lang="ts">
defineProps<{ title: string; more?: string; moreAccent?: boolean }>();
</script>

<template>
  <div class="section-title">
    <h3>{{ title }}</h3>
    <span v-if="more" class="more" :class="{ accent: moreAccent }">{{ more }}</span>
  </div>
</template>

<style scoped>
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}
.section-title h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-ink);
}
.section-title .more {
  font-family: var(--ff-mono);
  font-size: 10px;
  color: var(--c-mute);
  letter-spacing: 0.14em;
}
.section-title .more.accent { color: var(--c-accent); }
</style>
