import { ref, onUnmounted } from 'vue';

export function useRetry() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  let abort: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clear() {
    if (timer) { clearTimeout(timer); timer = null; }
    abort?.abort();
    abort = null;
  }

  async function run<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    clear();
    error.value = null;
    loading.value = true;
    abort = new AbortController();
    try {
      return await fn(abort.signal);
    } catch (e: any) {
      if (e?.name === 'AbortError') return null;
      error.value = e?.message || '加载失败，请稍后重试';
      return null;
    } finally {
      loading.value = false;
    }
  }

  function reload(fn: (signal: AbortSignal) => Promise<unknown>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void run(fn); }, 250);
  }

  onUnmounted(clear);
  return { loading, error, run, reload };
}
