import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ApiException } from '../../common/filters/api.exception';
import { StructuredLogger } from '../../common/logger/structured-logger';
import { FeatureService } from '../feature/feature.service';
import {
  AiModuleId,
  Attachment,
  Citation,
  IntentHint,
  InvokeAiInput,
  InvokeResponse,
  NextAction,
  SimilarCase,
  ToolCall,
  ToolCallType,
} from './ai.schemas';

interface AiHistoryItem {
  id: string;
  module: AiModuleId;
  prompt: string;
  response: InvokeResponse;
  createdAt: string;
}

const modules = [
  { id: 'insight', num: '01', name: '客户洞察', desc: '买卖历史 + 预测', color: '#E8542C' },
  { id: 'quote', num: '02', name: '智能报价', desc: 'SAP 价 + 毛利率预估', color: '#2E5A88' },
  { id: 'risk', num: '03', name: '订单预警', desc: '发货 + 库存 + 质量提示', color: '#2E7D5B' },
  { id: 'after', num: '04', name: '售后分析', desc: '原因归类 + 责任建议', color: '#B07F1F' },
  { id: 'kb', num: '05', name: '知识助手', desc: '产品 + 技术 + 施工文档', color: '#5B6470' },
  { id: 'follow', num: '06', name: '跟进助手', desc: '客户跟进 + 提醒', color: '#8A95A3' },
] as const;

const DEFAULT_RATE_LIMIT_MAX_CALLS = 60;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

function parseRateLimit(value: string | undefined): { maxCalls: number; windowMs: number } {
  const match = /^([1-9]\d*)\/([1-9]\d*)(ms|s|m)$/.exec(value ?? '');
  if (!match) return { maxCalls: DEFAULT_RATE_LIMIT_MAX_CALLS, windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS };
  const unitMs = match[3] === 'm' ? 60_000 : match[3] === 's' ? 1_000 : 1;
  return { maxCalls: Number(match[1]), windowMs: Number(match[2]) * unitMs };
}

@Injectable()
export class AiService {
  private readonly historyByUser = new Map<string, AiHistoryItem[]>();
  private readonly callsByUser = new Map<string, number[]>();
  private readonly rateLimitMaxCalls: number;
  private readonly rateLimitWindowMs: number;

  constructor(
    config: ConfigService,
    private readonly features: FeatureService,
    private readonly logger: StructuredLogger,
  ) {
    const rateLimit = parseRateLimit(config.get<string>('RATE_LIMIT_AI'));
    this.rateLimitMaxCalls = rateLimit.maxCalls;
    this.rateLimitWindowMs = rateLimit.windowMs;
  }

  listModules(): readonly unknown[] { return modules; }

  invoke(module: AiModuleId, input: InvokeAiInput, userId: string): InvokeResponse {
    const startedAt = Date.now();
    this.logger.log({ event: 'ai_invoke_started', module, attachmentsCount: input.attachments?.length ?? 0, intentHints: input.intentHints ?? [] }, 'ai');
    try {
      this.assertFeatureEnabled();
      this.assertRateLimit(userId);
      const multimodal = (input.attachments?.length ?? 0) > 0;
      const response = multimodal
        ? this.multimodalResponse(input.attachments ?? [], input.prompt)
        : this.routeByIntent(input.prompt, input.intentHints ?? [], module);
      for (const call of response.toolCalls) {
        this.logger.log({ event: 'ai_tool_call_dispatched', module, type: call.type }, 'ai');
      }
      this.logger.log({ event: 'ai_invoke_completed', module, latencyMs: Date.now() - startedAt, toolCallsCount: response.toolCalls.length }, 'ai');
      const item: AiHistoryItem = { id: randomUUID(), module, prompt: input.prompt, response, createdAt: new Date().toISOString() };
      const history = this.historyByUser.get(userId) ?? [];
      history.unshift(item);
      this.historyByUser.set(userId, history.slice(0, 100));
      return response;
    } catch (err) {
      this.logger.error({ event: 'ai_invoke_failed', module, code: err instanceof ApiException ? err.code : 0, msg: err instanceof Error ? err.message : String(err) }, undefined, 'ai');
      throw err;
    }
  }

  history(module: AiModuleId, userId: string): AiHistoryItem[] {
    return (this.historyByUser.get(userId) ?? []).filter((item) => item.module === module);
  }

  private assertFeatureEnabled(): void {
    if (!this.features.isEnabled('AI_HOME')) throw new ApiException(50502, 'AI 对话首页功能未开启', HttpStatus.FORBIDDEN);
  }

  // ponytail: phase-one limiting is per process; move counters to Redis before horizontal scaling.
  private assertRateLimit(userId: string): void {
    const now = Date.now();
    const cutoff = now - this.rateLimitWindowMs;
    const calls = (this.callsByUser.get(userId) ?? []).filter((ts) => ts > cutoff);
    if (calls.length >= this.rateLimitMaxCalls) throw new ApiException(20429, 'AI 调用过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    calls.push(now);
    this.callsByUser.set(userId, calls);
  }

  // ponytail: phase one fixture — all 5 tool-call types reachable, multimodal forces a customer_qualification + kb_reply pair.
  private multimodalResponse(attachments: Attachment[], prompt: string): InvokeResponse {
    const calls: ToolCall[] = [
      { id: randomUUID(), type: 'customer_qualification', args: { attachmentIds: attachments.map(a => a.fileId) }, preview: { customerName: '上海建工建材有限公司', confidence: 0.92, source: 'business_card' } },
      { id: randomUUID(), type: 'kb_reply', args: { attachmentIds: attachments.filter(a => a.kind === 'image').map(a => a.fileId) }, preview: { snippet: '已识别图片中关键文字与材质，建议匹配 K11 通用型防水涂料。' } },
    ];
    const reply = '已识别 ' + attachments.length + ' 个附件，正在生成对话首页草稿。';
    return { reply, toolCalls: calls, citations: [{ docId: 'doc-kb-001', title: 'K11 防水涂料施工指南', snippet: '基面清理 → 配料 → 涂刷 → 养护' }], similarCases: [{ id: 'case-2026-001', title: '浦东新区防水改造', outcome: '已签约 ¥14.82万' }], nextActions: [{ id: 'na-draft', label: '基于识别生成订单草稿', payload: { kind: 'biz:draft:order' } }, { id: 'na-kb', label: '查看 K11 施工详情', payload: { docId: 'doc-kb-001' } }] };
  }

  private routeByIntent(prompt: string, hints: IntentHint[], module: AiModuleId): InvokeResponse {
    const primary = hints[0];
    let type: ToolCallType; let preview: unknown; let reply: string;
    // ponytail: keyword routing keeps the submit card reachable until model tool selection is available.
    if (/(提交|确认创建|保存到业务系统)/.test(prompt)) {
      type = 'submit';
      preview = { kind: 'biz:submit', requiresConfirmation: true };
      reply = '已生成业务提交确认卡，请核对后继续。';
    } else {
      switch (primary) {
      case 'customer_qualification': type = 'customer_qualification'; preview = { customerName: '上海建工建材有限公司', confidence: 0.81, source: 'prompt' }; reply = '已根据描述识别客户资质，请确认后继续。'; break;
      case 'data_query': type = 'data_query'; preview = { kpis: [{ label: '本月 GMV', value: '3672.00 元' }, { label: '订单数', value: '1 单' }] }; reply = '已查询相关数据，详见下方卡片。'; break;
      case 'kb_query': type = 'kb_reply'; preview = { snippet: prompt.slice(0, 80) }; reply = '已检索知识库，找到以下相关内容。'; break;
      case 'draft': type = 'draft'; preview = { formFields: [{ key: 'customerName', label: '客户名称', value: '' }] }; reply = '已生成草稿，请补全字段后提交。'; break;
      default:
        type = this.defaultToolType(module);
        preview = this.defaultPreview(type);
        reply = '已为你准备下一步操作。';
      }
    }
    const toolCalls: ToolCall[] = [{ id: randomUUID(), type, args: { module }, preview }];
    return { reply, toolCalls, citations: primary === 'kb_query' ? [{ docId: 'doc-kb-002', title: 'JS 聚合物防水涂料技术规格', snippet: prompt.slice(0, 60) }] : [], similarCases: primary === 'customer_qualification' ? [{ id: 'case-2026-002', title: '上海建工近 30 天签约', outcome: '3 单 / ¥9.6 万' }] : [], nextActions: [{ id: 'na-submit', label: '提交到业务系统', payload: { kind: 'biz:submit' } }] };
  }

  private defaultToolType(module: AiModuleId): ToolCallType {
    switch (module) {
      case 'insight': return 'customer_qualification';
      case 'quote': return 'data_query';
      case 'risk': return 'data_query';
      case 'after': return 'data_query';
      case 'kb': return 'kb_reply';
      case 'follow': return 'draft';
    }
  }

  private defaultPreview(type: ToolCallType): unknown {
    switch (type) {
      case 'customer_qualification': return { customerName: '示例客户', confidence: 0.5 };
      case 'data_query': return { kpis: [{ label: '示例指标', value: '0' }] };
      case 'kb_reply': return { snippet: '示例知识库答复' };
      case 'draft': return { formFields: [{ key: 'name', label: '名称', value: '' }] };
      case 'submit': return { id: 'preview', kind: 'biz:submit' };
    }
  }
}
