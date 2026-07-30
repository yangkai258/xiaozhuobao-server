import { ref, onUnmounted } from 'vue';
import { BizError, friendlyMessage, isAuthExpired } from '../utils/error';

export interface SubmitOptions {
  onError?: (err: BizError) => void;
  rearmMs?: number;
}

export function useSubmit(opts: SubmitOptions = {}) {
  const submitting = ref(false);
  const lastError = ref<string | null>(null);
  const rearmMs = opts.rearmMs ?? 1500;
  let rearming: ReturnType<typeof setTimeout> | null = null;

  function disarm() {
    if (rearming) clearTimeout(rearming);
    rearming = setTimeout(() => { submitting.value = false; lastError.value = null; }, rearmMs);
  }

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    if (submitting.value) return null;
    submitting.value = true;
    lastError.value = null;
    try {
      const v = await fn();
      submitting.value = false;
      return v;
    } catch (e: unknown) {
      const err = e instanceof BizError ? e : new BizError({ http: 0, code: 0, msg: String(e) });
      lastError.value = friendlyMessage(err.code, err.msg);
      opts.onError?.(err);
      uni.showToast({ title: lastError.value, icon: 'none' });
      if (isAuthExpired(err.code)) {
        submitting.value = false;
        throw err;
      }
      if (err.code === 20428 || err.code === 20429) {
        disarm();
      } else {
        submitting.value = false;
      }
      return null;
  }
  }

  onUnmounted(() => { if (rearming) clearTimeout(rearming); });
  return { submitting, lastError, run };
}
