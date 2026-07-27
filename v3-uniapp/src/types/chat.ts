export type Role = 'user' | 'assistant' | 'system';
export type IntentHint = 'customer_qualification' | 'data_query' | 'kb_query' | 'draft';
export type ToolCallType = 'customer_qualification' | 'data_query' | 'kb_reply' | 'draft' | 'submit';
export type AttachmentKind = 'image' | 'file';

export interface Attachment { fileId: string; kind: AttachmentKind; }

export type MsgContent =
  | { kind: 'text'; text: string }
  | { kind: 'image'; fileId: string; url?: string }
  | { kind: 'file'; fileId: string; name: string; mime: string };

export interface ToolCall { id: string; type: ToolCallType; args: Record<string, unknown>; preview?: unknown; }
export interface Citation { docId: string; title: string; snippet: string; href?: string; }
export interface SimilarCase { id: string; title: string; outcome: string; }
export interface NextAction { id: string; label: string; payload?: Record<string, unknown>; }

export interface ChatMessage {
  id: string;
  role: Role;
  contents: MsgContent[];
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
  citations?: Citation[];
  similarCases?: SimilarCase[];
  nextActions?: NextAction[];
  at: string;
}

export interface InvokeRequest {
  prompt: string;
  context?: Record<string, unknown>;
  attachments?: Attachment[];
  intentHints?: IntentHint[];
}

export interface InvokeResponse {
  reply: string;
  toolCalls: ToolCall[];
  citations: Citation[];
  similarCases: SimilarCase[];
  nextActions: NextAction[];
}

export type ComponentName =
  | 'ChatBubble'
  | 'ToolRecog'
  | 'ToolDraft'
  | 'ToolKpi'
  | 'ToolList'
  | 'ToolKb'
  | 'ToolReceipt'
  | 'ToolBizSubmit';

export interface FeatureFlags { AI_HOME: boolean; }
