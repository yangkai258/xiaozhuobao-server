<script setup lang="ts">
defineProps<{ status: string; cls?: 'ok' | 'warn' | 'accent' | 'mute' }>();
</script>

<template>
  <span class="tag" :class="cls || 'mute'">{{ status }}</span>
</template>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 3px 8px 3px 6px;
  border-radius: 999px;
  background: var(--c-line-soft);
  color: var(--c-steel);
  font-family: var(--ff-body);
  white-space: nowrap;
}
.tag::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.tag.ok      { background: var(--c-ok-soft);     color: var(--c-ok); }
.tag.warn    { background: var(--c-warn-soft);   color: var(--c-warn); }
.tag.accent  { background: var(--c-accent-soft); color: var(--c-accent); }
.tag.mute    { background: var(--c-line-soft);   color: var(--c-mute); }
</style>
