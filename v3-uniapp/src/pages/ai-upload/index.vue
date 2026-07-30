<script setup lang="ts">
import { ref } from 'vue';
import { api_storage_ai } from '../../api/client';

interface UploadRow { name: string; mimeType: string; base64: string; fileId?: string; }
const file = ref<UploadRow | null>(null);
const busy = ref(false);
const result = ref<{ fileId?: string; id?: string } | null>(null);
const error = ref('');

async function readAsBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (uni as any).getFileSystemManager().readFile({ filePath: path, encoding: 'base64', success: (r: { data: string }) => resolve(r.data), fail: (e: unknown) => reject(e) });
  });
}

function onPick() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (uni as any).chooseFile?.({ count: 1, success: async (res: { tempFiles: Array<{ name: string; path: string }> }) => {
    const f = res.tempFiles[0]; if (!f) return;
    const base64 = await readAsBase64(f.path);
    file.value = { name: f.name, mimeType: f.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', base64 };
    result.value = null; error.value = '';
  } });
}

async function onUpload() {
  if (!file.value || busy.value) return;
  busy.value = true; error.value = ''; result.value = null;
  try { const r = await api_storage_ai.upload(file.value); result.value = r.data || {}; }
  catch (e: any) { error.value = e?.message || '上传失败'; }
  finally { busy.value = false; }
}
</script>

<template>
  <view class="page">
    <view class="titlebar"><text class="title">智能上传</text></view>
    <view class="card">
      <view class="btn" @click="onPick"><text>选择文件</text></view>
      <text v-if="file" class="meta">已选择：{{ file.name }} ({{ (file.base64.length * 0.75 / 1024).toFixed(1) }} KB)</text>
      <view class="btn primary" :class="{ disabled: !file || busy }" @click="onUpload"><text>{{ busy ? '上传中...' : '上传自传' }}</text></view>
      <text v-if="result?.fileId || result?.id" class="ok">上传成功，fileId：{{ result.fileId || result.id }}</text>
      <text v-if="error" class="err">{{ error }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page { background: var(--c-paper); min-height: 100vh; }
.titlebar { display: flex; align-items: center; padding: 4px 12px; border-bottom: 1px solid var(--c-line-soft); }
.title { flex: 1; text-align: center; font-weight: 600; }
.card { margin: 16px; padding: 16px; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); border-radius: var(--r-md); display: flex; flex-direction: column; gap: 10px; }
.btn { padding: 10px 0; text-align: center; border: 1px solid var(--c-line-soft); border-radius: 8px; font-size: 13px; }
.btn.primary { background: var(--c-accent); color: #fff; border-color: transparent; font-weight: 600; }
.btn.disabled { opacity: 0.6; pointer-events: none; }
.meta { font-size: 12px; color: var(--c-mute); }
.ok { color: var(--c-ok); font-size: 12px; }
.err { color: var(--c-danger); font-size: 12px; }
</style>
