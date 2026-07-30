import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { api_ai, api_storage_ai, type InvokePayload } from '../api/client';
import { BizError, friendlyMessage } from '../utils/error';
import type { ChatMessage, IntentHint, InvokeResponse, ToolCall, Attachment } from '../types/chat';
import { inferIntentHints } from '../composables/useAIRouter';

const STORAGE_KEY = 'xzb_chat_sessions_v1';
const HINT_TO_MODULE: Record<IntentHint, string> = {
  customer_qualification: 'insight',
  data_query: 'risk',
  kb_query: 'kb',
  draft: 'follow',
};

export interface ChatSession {
  id: string;
  title: string;
  module: string;
  hints: IntentHint[];
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface PersistedShape { sessions: ChatSession[]; activeId: string | null; }

function loadPersisted(): PersistedShape {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY) as string | undefined;
    if (!raw) return { sessions: [], activeId: null };
    const v = JSON.parse(raw) as PersistedShape;
    if (!Array.isArray(v.sessions)) return { sessions: [], activeId: null };
    return v;
  } catch { return { sessions: [], activeId: null }; }
}

function persist(sessions: ChatSession[], activeId: string | null) {
  try { uni.setStorageSync(STORAGE_KEY, JSON.stringify({ sessions, activeId })); } catch { /* swallow quota errors */ }
}

export const useChatStore = defineStore('chat', () => {
  const initial = loadPersisted();
  const sessions = ref<ChatSession[]>(initial.sessions);
  const activeId = ref<string | null>(initial.activeId);
  const isSending = ref(false);
  const lastError = ref<BizError | null>(null);

  const activeSession = computed<ChatSession | null>(() => sessions.value.find((s) => s.id === activeId.value) || null);

  function newSession(hints: IntentHint[] = [], module?: string): ChatSession {
    const aiModule = module ?? (hints[0] ? HINT_TO_MODULE[hints[0]] : 'insight');
    const now = new Date().toISOString();
    const s: ChatSession = {
      id: uuidv4(),
      title: '新对话',
      module: aiModule,
      hints,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    sessions.value.unshift(s);
    activeId.value = s.id;
    persist(sessions.value, activeId.value);
    return s;
  }

  function selectSession(id: string) {
    if (sessions.value.some((s) => s.id === id)) { activeId.value = id; persist(sessions.value, activeId.value); }
  }

  function removeSession(id: string) {
    sessions.value = sessions.value.filter((s) => s.id !== id);
    if (activeId.value === id) activeId.value = sessions.value[0]?.id ?? null;
    persist(sessions.value, activeId.value);
  }

  function renameSession(id: string, title: string) {
    const s = sessions.value.find((x) => x.id === id);
    if (s) { s.title = title; s.updatedAt = new Date().toISOString(); persist(sessions.value, activeId.value); }
  }

  function pushMessage(id: string, msg: ChatMessage) {
    const s = sessions.value.find((x) => x.id === id);
    if (!s) return;
    s.messages.push(msg);
    s.updatedAt = new Date().toISOString();
    if (s.title === '新对话' && msg.role === 'user') {
      s.title = (msg.contents[0]?.kind === 'text' ? msg.contents[0].text : '').slice(0, 18) || '新对话';
    }
    persist(sessions.value, activeId.value);
  }

  function appendToolCalls(id: string, msgId: string, res: InvokeResponse) {
    const s = sessions.value.find((x) => x.id === id);
    if (!s) return;
    const m = s.messages.find((x) => x.id === msgId);
    if (!m) return;
    m.toolCalls = res.toolCalls;
    m.citations = res.citations;
    m.similarCases = res.similarCases;
    m.nextActions = res.nextActions;
    persist(sessions.value, activeId.value);
  }

  function ensureActiveSession(hints: IntentHint[], module?: string): ChatSession {
    if (activeSession.value) return activeSession.value;
    return newSession(hints, module);
  }

  async function uploadAttachment(file: { name: string; mimeType: string; base64: string }): Promise<Attachment> {
    const r = await api_storage_ai.upload(file);
    const data = r.data || {};
    const kind: Attachment['kind'] = file.mimeType.startsWith('image/') ? 'image' : 'file';
    return { fileId: String(data.fileId || data.id || ''), kind };
  }

  async function send(input: { prompt: string; attachments?: Attachment[]; hints?: IntentHint[]; module?: string }): Promise<void> {
    lastError.value = null;
    if (isSending.value) return;
    const hints = input.hints ?? inferIntentHints(input.prompt);
    const s = ensureActiveSession(hints, input.module);
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      contents: [{ kind: 'text', text: input.prompt }],
      attachments: input.attachments,
      at: new Date().toISOString(),
    };
    pushMessage(s.id, userMsg);
    isSending.value = true;
    try {
      const payload: InvokePayload = { prompt: input.prompt, attachments: input.attachments, intentHints: hints };
      const r = await api_ai.invoke(s.module, payload);
      const data = r.data as InvokeResponse;
      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        contents: [{ kind: 'text', text: data.reply || '' }],
        at: new Date().toISOString(),
      };
      pushMessage(s.id, assistantMsg);
      appendToolCalls(s.id, assistantMsg.id, data);
    } catch (err: unknown) {
      const e = err instanceof BizError ? err : new BizError({ http: 0, code: 0, msg: String(err) });
      lastError.value = e;
      const fallback: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        contents: [{ kind: 'text', text: friendlyMessage(e.code, e.msg) }],
        at: new Date().toISOString(),
      };
      pushMessage(s.id, fallback);
    } finally { isSending.value = false; }
  }

  function clearAll() { sessions.value = []; activeId.value = null; persist(sessions.value, activeId.value); }

  return {
    sessions, activeId, activeSession, isSending, lastError,
    newSession, selectSession, removeSession, renameSession, clearAll,
    send, uploadAttachment,
  };
});
