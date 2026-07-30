<script setup lang="ts">
import { ref } from 'vue';
import { api_storage_ai } from '../../api/client';

const props = defineProps<{ sending: boolean }>();
const emit = defineEmits<{ (e: 'send', payload: { prompt: string; attachments?: Array<{ fileId: string; kind: 'image' | 'file' }> }): void }>();
const text = ref('');
const attachments = ref<Array<{ fileId: string; kind: 'image' | 'file'; name?: string }>>([]);
const uploading = ref(false);

function onSubmit() {
  if (!text.value.trim() || props.sending || uploading.value) return;
  emit('send', { prompt: text.value, attachments: attachments.value.map((a) => ({ fileId: a.fileId, kind: a.kind })) });
  text.value = '';
  attachments.value = [];
}

async function readAsBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (uni as any).getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success: (r: { data: string }) => resolve(r.data),
      fail: (e: unknown) => reject(e),
    });
  });
}

async function onPickImage() {
  if (props.sending || uploading.value) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const choose = (uni as any).chooseImage;
  if (!choose) { attachments.value.push({ fileId: 'mock-' + Date.now().toString(36), kind: 'image', name: 'mock.jpg' }); return; }
  choose({
    count: 1,
    success: async (res: { tempFilePaths: string[] }) => {
      const p = res.tempFilePaths[0];
      if (!p) return;
      uploading.value = true;
      try {
        const base64 = await readAsBase64(p);
        const r = await api_storage_ai.upload({ name: p.split('/').pop() || 'image.jpg', mimeType: 'image/jpeg', base64 });
        const fileId = r.data?.fileId || r.data?.id || '';
        if (fileId) attachments.value.push({ fileId, kind: 'image', name: p.split('/').pop() });
      } finally { uploading.value = false; }
    },
  });
}

async function onPickFile() {
  if (props.sending || uploading.value) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chooseFile = (uni as any).chooseFile;
  if (!chooseFile) return;
  chooseFile({
    count: 1,
    success: async (res: { tempFiles: Array<{ name: string; path: string }> }) => {
      const f = res.tempFiles[0];
      if (!f) return;
      uploading.value = true;
      try {
        const base64 = await readAsBase64(f.path);
        const r = await api_storage_ai.upload({ name: f.name, mimeType: 'application/pdf', base64 });
        const fileId = r.data?.fileId || r.data?.id || '';
        if (fileId) attachments.value.push({ fileId, kind: 'file', name: f.name });
      } finally { uploading.value = false; }
    },
  });
}

function removeAt(i: number) { attachments.value.splice(i, 1); }
</script>

<template>
  <view class="composer">
    <view v-if="attachments.length" class="atts">
      <view v-for="(a, i) in attachments" :key="a.fileId" class="chip" @click="removeAt(i)">
        <text class="chip-text">{{ a.kind === 'image' ? '[IMG]' : '[FILE]' }} {{ a.name || a.fileId.slice(0, 8) }} ×</text>
      </view>
    </view>
    <view class="row">
      <view class="btn" @click="onPickImage"><text>拍照</text></view>
      <view class="btn" @click="onPickFile"><text>文件</text></view>
      <input v-model="text" class="input" placeholder="输入问题" :disabled="sending" />
      <view class="send-btn" :class="{ disabled: sending || uploading }" @click="onSubmit"><text>{{ sending || uploading ? '...' : '发送' }}</text></view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.composer { padding: 10px 12px; border-top: 1px solid var(--c-line-soft); background: var(--c-paper); display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; align-items: center; gap: 8px; }
.btn { padding: 0 10px; height: 32px; border: 1px solid var(--c-line-soft); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--c-mute); }
.input { flex: 1; height: 32px; padding: 0 10px; border: 1px solid var(--c-line-soft); border-radius: 6px; font-size: 14px; }
.send-btn { padding: 0 14px; height: 32px; background: var(--c-accent); color: #fff; border-radius: 6px; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; }
.send-btn.disabled { opacity: 0.6; pointer-events: none; }
.atts { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 4px 10px; border-radius: 12px; background: var(--c-paper-2); border: 1px solid var(--c-line-soft); font-size: 11px; }
.chip-text { color: var(--c-mute); }
</style>
