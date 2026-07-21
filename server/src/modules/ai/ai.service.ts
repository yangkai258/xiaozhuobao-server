import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiModuleId, InvokeAiInput } from './ai.schemas';

interface AiHistoryItem {
  id: string;
  module: AiModuleId;
  prompt: string;
  answer: string;
  tokens: string;
  createdAt: string;
}

const modules = [
  { id: 'insight', num: '01', name: '客户洞察', desc: '买卖历史 + 预测', color: '#E8542C' },
  { id: 'quote', num: '02', name: '智能报价', desc: 'SAP 价 + 毛利率预测', color: '#2E5A88' },
  { id: 'risk', num: '03', name: '订单预警', desc: '发货 + 库存 + 质量警示', color: '#2E7D5B' },
  { id: 'after', num: '04', name: '售后分析', desc: '原因归类 + 责任建议', color: '#B07F1F' },
  { id: 'kb', num: '05', name: '知识助手', desc: '产品 + 技术 + 施工文档', color: '#5B6470' },
  { id: 'follow', num: '06', name: '跟进助手', desc: '客户跟进 + 备忘', color: '#8A95A3' },
] as const;

@Injectable()
export class AiService {
  private readonly historyByUser = new Map<string, AiHistoryItem[]>();

  listModules(): readonly unknown[] {
    return modules;
  }

  invoke(module: AiModuleId, input: InvokeAiInput, userId: string): AiHistoryItem {
    const item: AiHistoryItem = {
      id: randomUUID(),
      module,
      prompt: input.prompt,
      answer: 'AI 服务尚未接入，当前请求已记录。',
      tokens: '0',
      createdAt: new Date().toISOString(),
    };
    // ponytail: in-memory mock history is intentional for phase one; replace it with the queued AI service and durable store.
    const history = this.historyByUser.get(userId) ?? [];
    history.unshift(item);
    this.historyByUser.set(userId, history.slice(0, 100));
    return item;
  }

  history(module: AiModuleId, userId: string): AiHistoryItem[] {
    return (this.historyByUser.get(userId) ?? []).filter((item) => item.module === module);
  }
}
