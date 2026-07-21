import { HttpStatus, Injectable } from '@nestjs/common';
import { AftersaleReason, AftersaleStatus, Prisma } from '@prisma/client';
import { ApiException } from '../../common/filters/api.exception';
import { AuthenticatedUser } from '../../common/types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AftersaleQuery, CreateAftersaleInput } from './aftersales.schemas';

const aftersaleSelect = {
  id: true,
  no: true,
  orderId: true,
  order: { select: { no: true } },
  customerId: true,
  customer: { select: { name: true } },
  material: true,
  reason: true,
  status: true,
  occurredAt: true,
  images: true,
  oaFlowId: true,
  version: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AftersaleSelect;

type AftersaleResult = Prisma.AftersaleGetPayload<{ select: typeof aftersaleSelect }>;

const statusLabels: Record<AftersaleStatus, string> = {
  PENDING_OA: '待 OA 审批',
  SAP_CREATED: 'SAP 已建单',
  IN_HANDLING: '处理中',
  CLOSED: '已关闭',
  REJECTED: '已驳回',
};

const reasonLabels: Record<AftersaleReason, string> = {
  QUALITY: '质量问题',
  WRONG_GOODS: '错发货',
  DAMAGED: '破损',
  OTHER: '其他',
};

@Injectable()
export class AftersalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: AftersaleQuery): Promise<unknown> {
    const where: Prisma.AftersaleWhereInput = {
      isDeleted: false,
      ...(query.filter_status ? { status: query.filter_status } : {}),
    };
    const items = await this.prisma.aftersale.findMany({
      where,
      select: aftersaleSelect,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : { skip: (query.page - 1) * query.size }),
      take: query.size,
    });
    const total = await this.prisma.aftersale.count({ where });
    return {
      items: items.map(this.serialize),
      page: query.page,
      size: query.size,
      total,
      hasMore: items.length === query.size,
      nextCursor: items.length === query.size ? items.at(-1)?.id ?? null : null,
    };
  }

  async findOne(identifier: string): Promise<unknown> {
    const aftersale = await this.prisma.aftersale.findFirst({
      where: { OR: [{ id: identifier }, { no: identifier }], isDeleted: false },
      select: aftersaleSelect,
    });
    if (!aftersale) {
      throw new ApiException(10404, `售后 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
    }
    return this.serialize(aftersale);
  }

  async create(input: CreateAftersaleInput, user: AuthenticatedUser): Promise<unknown> {
    const order = await this.prisma.order.findFirst({
      where: { id: input.orderId, isDeleted: false },
      select: { id: true, customerId: true },
    });
    if (!order) {
      throw new ApiException(10422, '关联订单不存在', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const no = await this.nextNumber();
    const aftersale = await this.prisma.aftersale.create({
      data: {
        ...input,
        no,
        occurredAt: new Date(input.occurredAt),
        orderId: order.id,
        customerId: order.customerId,
        createdById: user.id,
        status: AftersaleStatus.PENDING_OA,
        version: 1,
      },
      select: aftersaleSelect,
    });
    return this.serialize(aftersale);
  }

  private async nextNumber(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const prefix = `AF${date}-`;
    const latest = await this.prisma.aftersale.findFirst({
      where: { no: { startsWith: prefix }, isDeleted: false },
      select: { no: true },
      orderBy: { no: 'desc' },
    });
    const sequence = latest ? Number(latest.no.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(sequence).padStart(3, '0')}`;
  }

  private readonly serialize = (aftersale: AftersaleResult): unknown => {
    const { order, customer, reason, status, ...rest } = aftersale;
    return {
      ...rest,
      orderNo: order.no,
      customerName: customer.name,
      reason: reasonLabels[reason],
      reasonCode: reason,
      status: statusLabels[status],
      statusCode: status,
    };
  };
}
