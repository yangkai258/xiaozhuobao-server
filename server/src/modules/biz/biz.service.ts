import { HttpStatus, Injectable } from '@nestjs/common';
import { BizKind, Prisma } from '@prisma/client';
import { ApiException } from '../../common/filters/api.exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { canTransitionBiz } from './biz-state-machine';
import { BizQuery, BizStatusInput, parseBizPayload } from './biz.schemas';

@Injectable()
export class BizService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: BizQuery): Promise<unknown> {
    const where: Prisma.BizSubmissionWhereInput = {
      isDeleted: false,
      ...(query.kind ? { kind: query.kind } : {}),
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
    const payload = parseBizPayload(kind, rawPayload);
    const customerId = typeof payload.customerId === 'string' ? payload.customerId : undefined;
    if (customerId) {
      const exists = await this.prisma.customer.count({ where: { id: customerId, isDeleted: false } });
      if (exists === 0) {
        throw new ApiException(10422, '关联客商不存在', HttpStatus.UNPROCESSABLE_ENTITY);
      }
    }
    return this.prisma.bizSubmission.create({
      data: {
        kind,
        payload: payload as Prisma.InputJsonObject,
        customerId,
        createdById: userId,
        version: 1,
      },
    });
  }

  async updateStatus(id: string, version: number, input: BizStatusInput): Promise<unknown> {
    const current = await this.prisma.bizSubmission.findFirst({ where: { id, isDeleted: false } });
    if (!current) {
      throw new ApiException(10404, `业务表单 ${id} 不存在`, HttpStatus.NOT_FOUND);
    }
    if (!canTransitionBiz(current.status, input.status)) {
      throw new ApiException(10008, '非法状态跃迁', HttpStatus.CONFLICT);
    }
    const updated = await this.prisma.bizSubmission.updateMany({
      where: { id, version, isDeleted: false },
      data: { status: input.status, version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new ApiException(10009, 'version 不匹配，请刷新后重试', HttpStatus.CONFLICT);
    }
    return this.prisma.bizSubmission.findFirst({ where: { id, isDeleted: false } });
  }
}
