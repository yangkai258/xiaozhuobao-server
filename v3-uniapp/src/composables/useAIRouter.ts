import type { IntentHint, InvokeResponse, ToolCall, ToolCallType, ComponentName } from '../types/chat';

// ponytail: phase one maps intent hints to a stable tool-call type; phase two adds model-side classification.
const HINT_TO_TYPE: Record<IntentHint, ToolCallType> = {
  customer_qualification: 'customer_qualification',
  data_query: 'data_query',
  kb_query: 'kb_reply',
  draft: 'draft',
};

const TYPE_TO_COMPONENT: Record<ToolCallType, ComponentName> = {
  customer_qualification: 'ToolRecog',
  data_query: 'ToolKpi',
  kb_reply: 'ToolKb',
  draft: 'ToolDraft',
  submit: 'ToolBizSubmit',
};

export function inferIntentHints(text: string): IntentHint[] {
  const hints = new Set<IntentHint>();
  if (/(客户|资质|建工|经销|现场拍照)/.test(text)) hints.add('customer_qualification');
  if (/(本月|订单|业绩|GMV|数据)/.test(text)) hints.add('data_query');
  if (/(文档|知识|施工|规格|K11|JS)/.test(text)) hints.add('kb_query');
  if (/(草稿|帮我写|拟|登记)/.test(text)) hints.add('draft');
  return Array.from(hints);
}

export function componentFor(toolCall: ToolCall): ComponentName {
  return TYPE_TO_COMPONENT[toolCall.type];
}

// Phase one: pick dominant hint -> tool-call-type for cases where the server did not include a toolCall.
export function dominantType(hints: IntentHint[]): ToolCallType | null {
  return hints.length > 0 ? HINT_TO_TYPE[hints[0]] : null;
}

export function summarizeInvoke(res: InvokeResponse): string {
  const types = res.toolCalls.map((c) => c.type);
  if (types.length === 0) return res.reply || '无回复';
  return types.join(', ');
}
