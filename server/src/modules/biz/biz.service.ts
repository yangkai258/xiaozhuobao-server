import { HttpStatus, Injectable } from '@nestjs/common';
import { BizKind, Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiException } from '../../common/filters/api.exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MetricsService } from '../../observability/metrics.service';
import { canTransitionBiz } from './biz-state-machine';
import { BizPayloadByKind, BizQuery, BizStatusInput, BizSummaryQuery, parseBizPayload } from './biz.schemas';
import { IfMatchHeader } from '../../common/decorators/if-match.decorator';

@Injectable()
export class BizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  async findMany(query: BizQuery): Promise<unknown> {
    const where: Prisma.BizSubmissionWhereInput = {
      isDeleted: false,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.filter_status ? { status: query.filter_status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.bizSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.size,
        take: query.size,
      }),
      this.prisma.bizSubmission.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      size: query.size,
      total,
      hasMore: query.page * query.size < total,
    };
  }

  async findOne(id: string): Promise<unknown> {
    const submission = await this.prisma.bizSubmission.findFirst({ where: { id, isDeleted: false } });
    if (!submission) {
      throw new ApiException(10404, `业务表单 ${id} 不存在`, HttpStatus.NOT_FOUND);
    }
    return submission;
  }

  async create(kind: BizKind, rawPayload: unknown, userId: string): Promise<unknown> {
    const payload = this.parsePayload(kind, rawPayload);
    const customerId = typeof payload.customerId === 'string' ? payload.customerId : undefined;
    if (customerId) {
      const exists = await this.prisma.customer.count({ where: { id: customerId, isDeleted: false } });
      if (exists === 0) {
        throw new ApiException(10422, '关联客商不存在', HttpStatus.UNPROCESSABLE_ENTITY);
      }
    }
    const created = await this.prisma.bizSubmission.create({
      data: {
        kind,
        payload: payload as unknown as Prisma.InputJsonObject,
        customerId,
        createdById: userId,
        version: 1,
      },
    });
    this.recordSubmission(created.kind, created.status);
    return created;
  }

  async updateStatus(id: string, version: IfMatchHeader, input: BizStatusInput): Promise<unknown> {
    const current = await this.prisma.bizSubmission.findFirst({ where: { id, isDeleted: false } });
    if (!current) {
      throw new ApiException(10404, `业务表单 ${id} 不存在`, HttpStatus.NOT_FOUND);
    }
    if (!canTransitionBiz(current.status, input.status)) {
      throw new ApiException(10008, '非法状态跃迁', HttpStatus.CONFLICT);
    }
    // ponytail: v3.0.3 hardening ticket #10 - 'If-Match: *' skips the version fence.
    if (version !== '*' && current.version !== version) {
      throw new ApiException(10009, 'version 不匹配，请刷新后重试', HttpStatus.CONFLICT);
    }
    const updated = await this.prisma.bizSubmission.updateMany({
      where: version === '*'
        ? { id, isDeleted: false }
        : { id, version: version as number, isDeleted: false },
      data: { status: input.status, version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new ApiException(10009, 'version 不匹配，请刷新后重试', HttpStatus.CONFLICT);
    }
    const refreshed = await this.prisma.bizSubmission.findFirst({ where: { id, isDeleted: false } });
    if (refreshed) {
      this.recordSubmission(refreshed.kind, refreshed.status);
    }
    return refreshed;
  }

  private recordSubmission(kind: BizKind, status: string): void {
    try {
      this.metrics.recordBizSubmission(kind, status);
    } catch {
      // ponytail: metrics must never fail a business flow.
    }
  }

  async summary(query: BizSummaryQuery, userId: string): Promise<unknown> {
    const base: Prisma.BizSubmissionWhereInput = { isDeleted: false };
    const where: Prisma.BizSubmissionWhereInput = { ...base, ...(query.kind ? { kind: query.kind } : {}) };
    const grouped = await this.prisma.bizSubmission.groupBy({
      by: ['kind', 'status'],
      where,
      _count: { _all: true },
    });
    const statusTotals: Record<string, number> = {};
    const items: { kind: BizKind; total: number; byStatus: Record<string, number> }[] = [];
    for (const entry of grouped) {
      const kind = entry.kind as BizKind;
      let row = items.find((it) => it.kind === kind);
      if (!row) { row = { kind, total: 0, byStatus: {} }; items.push(row); }
      row.byStatus[entry.status] = entry._count._all;
      row.total += entry._count._all;
      statusTotals[entry.status] = (statusTotals[entry.status] ?? 0) + entry._count._all;
    }
    items.sort((a, b) => a.kind.localeCompare(b.kind));
    return { items, statusTotals, generatedBy: userId, at: new Date().toISOString() };
  }

  private parsePayload(kind: BizKind, rawPayload: unknown): BizPayloadByKind[typeof kind] {
    try {
      return parseBizPayload(kind, rawPayload);
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues
          .map((issue) => (issue.path.length > 0 ? issue.path.join('.') + ': ' : '') + issue.message)
          .join('; ');
        throw new ApiException(40000, message || 'payload 非法', HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }
}
