import { defineStore } from 'pinia';

interface SessionMeta { id: string; title: string; createdAt: string; }

// ponytail: phase one keeps sessions in-memory; phase two swaps in durable storage + server list.
export const useChatMemoryStore = defineStore('chatMemory', {
  state: () => ({
    sessions: [] as SessionMeta[],
    currentId: '' as string,
  }),
  actions: {
    ensure(): string {
      if (!this.currentId) {
        const id = 'local_' + Date.now().toString(36);
        const title = '新会话';
        this.sessions.unshift({ id, title, createdAt: new Date().toISOString() });
        this.currentId = id;
      }
      return this.currentId;
    },
    rename(id: string, title: string): void {
      const s = this.sessions.find((x) => x.id === id);
      if (s) s.title = title;
    },
    switchTo(id: string): void { this.currentId = id; },
    reset(): void { this.sessions = []; this.currentId = ''; },
  },
});
