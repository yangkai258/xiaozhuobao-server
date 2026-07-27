import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { api_ai } from '../api/client';
import { BizError } from '../utils/error';
import type { Attachment, ChatMessage, IntentHint, InvokeResponse } from '../types/chat';
import { inferIntentHints } from './useAIRouter';

interface SendInput { prompt: string; attachments?: Attachment[]; intentHints?: IntentHint[]; }

// ponytail: phase one keeps messages in-memory only; phase two swaps in chatMemory store + DB.
export function useChat() {
  const messages = ref<ChatMessage[]>([]);
  const isSending = ref(false);
  const lastError = ref<BizError | null>(null);

  function pushLocal(role: ChatMessage['role'], contents: ChatMessage['contents'], attachments?: Attachment[]): ChatMessage {
    const msg: ChatMessage = { id: uuidv4(), role, contents, attachments, at: new Date().toISOString() };
    messages.value.push(msg);
    return msg;
  }

  function appendToolCalls(msg: ChatMessage, res: InvokeResponse): void {
    msg.toolCalls = res.toolCalls;
    msg.citations = res.citations;
    msg.similarCases = res.similarCases;
    msg.nextActions = res.nextActions;
  }

  async function send(input: SendInput): Promise<void> {
    lastError.value = null;
    isSending.value = true;
    const userMsg = pushLocal('user', [{ kind: 'text', text: input.prompt }], input.attachments);
    try {
      // ponytail: phase one picks the AI module from the dominant hint; phase two lets the server route.
      const intentHints = input.intentHints ?? inferIntentHints(input.prompt);
      const moduleByHint: Record<string, string> = { customer_qualification: 'insight', data_query: 'risk', kb_query: 'kb', draft: 'follow' };
      const aiModule = (intentHints[0] && moduleByHint[intentHints[0]]) || 'insight';
      const data = (await api_ai.invoke(aiModule, { prompt: input.prompt, attachments: input.attachments, intentHints })).data as InvokeResponse;
      const assistantMsg = pushLocal('assistant', [{ kind: 'text', text: data.reply }]);
      appendToolCalls(assistantMsg, data);
    } catch (err) {
      lastError.value = err instanceof BizError ? err : new BizError({ http: 0, code: 0, msg: String(err) });
      const assistantMsg = pushLocal('assistant', [{ kind: 'text', text: '请求失败：' + (lastError.value.msg || '未知错误') }]);
      assistantMsg.id = userMsg.id + '_err';
    } finally {
      isSending.value = false;
    }
  }

  async function retry(msgId: string): Promise<void> {
    const idx = messages.value.findIndex((m) => m.id === msgId);
    if (idx < 0) return;
    const target = messages.value[idx];
    const text = target.contents.map((c) => c.kind === 'text' ? c.text : '').join('\n');
    await send({ prompt: text, attachments: target.attachments, intentHints: undefined });
  }

  function clear(): void { messages.value = []; lastError.value = null; }

  return { messages, isSending, lastError, send, retry, clear };
}
