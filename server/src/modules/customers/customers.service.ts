import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { ApiException } from '../../common/filters/api.exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CustomerPayload, CustomerQuery, CustomerUpdate } from './customers.schemas';

const customerListSelect = {
  id: true,
  bp: true,
  code: true,
  name: true,
  cat: true,
  status: true,
  contact: true,
  addr: true,
  regionBp: true,
  version: true,
  isDeleted: true,
} satisfies Prisma.CustomerSelect;

const orderStatusLabels: Record<OrderStatus, string> = {
  DRAFT: '草稿',
  PENDING_CONFIRM: '待确认',
  CONFIRMED: '已确认',
  SHIPPED: '已发货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: CustomerQuery): Promise<unknown> {
    const where: Prisma.CustomerWhereInput = {
      isDeleted: false,
      ...(query.keyword
        ? {
            OR: ['bp', 'code', 'name', 'contact'].map((field) => ({
              [field]: { contains: query.keyword, mode: 'insensitive' as const },
            })),
          }
        : {}),
      ...(query.filter_cat ? { cat: query.filter_cat } : {}),
      ...(query.filter_status ? { status: query.filter_status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: customerListSelect,
        orderBy: { [query.sort]: query.order },
        skip: (query.page - 1) * query.size,
        take: query.size,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      size: query.size,
      total,
      hasMore: query.page * query.size < total,
    };
  }

  async findOne(identifier: string): Promise<unknown> {
    const customer = await this.prisma.customer.findFirst({ where: this.identifierWhere(identifier) });
    if (!customer) {
      throw new ApiException(10404, `客商 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
    }

    const [orderStats, aftersaleCount, projectCount, recentOrders] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: { customerId: customer.id, isDeleted: false },
        _count: true,
        _sum: { amtCents: true },
      }),
      this.prisma.aftersale.count({ where: { customerId: customer.id, isDeleted: false } }),
      this.prisma.project.count({ where: { customerId: customer.id, isDeleted: false } }),
      this.prisma.order.findMany({
        where: { customerId: customer.id, isDeleted: false },
        select: { id: true, no: true, amtCents: true, status: true, orderDate: true, version: true },
        orderBy: { orderDate: 'desc' },
        take: 5,
      }),
    ]);

    return {
      ...customer,
      stats: {
        orderCount: String(orderStats._count),
        orderTotalCents: (orderStats._sum.amtCents ?? 0n).toString(),
        aftersaleCount: String(aftersaleCount),
        projectCount: String(projectCount),
      },
      recentOrders: recentOrders.map((order) => ({
        ...order,
        amtCents: order.amtCents.toString(),
        status: orderStatusLabels[order.status],
        orderDate: order.orderDate.toISOString().slice(0, 10),
      })),
    };
  }

  async create(input: CustomerPayload, userId: string): Promise<unknown> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const identifiers = await this.nextIdentifiers();
      try {
        return await this.prisma.customer.create({
          data: { ...identifiers, ...input, createdById: userId, updatedById: userId, version: 1 },
          select: customerListSelect,
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
          throw error;
        }
      }
    }
    throw new ApiException(10422, '客商编号或名称冲突', HttpStatus.UNPROCESSABLE_ENTITY);
  }

  async update(
    identifier: string,
    version: number,
    input: CustomerUpdate,
    userId: string,
  ): Promise<unknown> {
    const where = { ...this.identifierWhere(identifier), isDeleted: false };
    const result = await this.prisma.customer.updateMany({
      where: { ...where, version },
      data: { ...input, updatedById: userId, version: { increment: 1 } },
    });
    if (result.count === 0) {
      const exists = await this.prisma.customer.count({ where });
      if (exists === 0) {
        throw new ApiException(10404, `客商 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
      }
      throw new ApiException(10009, 'version 不匹配，请刷新后重试', HttpStatus.CONFLICT);
    }
    return this.prisma.customer.findFirst({ where, select: customerListSelect });
  }

  private identifierWhere(identifier: string): Prisma.CustomerWhereInput {
    return { OR: [{ id: identifier }, { bp: identifier }], isDeleted: false };
  }

  private async nextIdentifiers(): Promise<{ bp: string; code: string }> {
    const year = new Date().getUTCFullYear();
    const prefix = `C-${year}-`;
    const latest = await this.prisma.customer.findFirst({
      where: { code: { startsWith: prefix }, isDeleted: false },
      select: { code: true },
      orderBy: { code: 'desc' },
    });
    const sequence = latest ? Number(latest.code.slice(prefix.length)) + 1 : 1;
    // ponytail: this short retry is enough for a single API instance; use a database sequence before horizontal scaling.
    return {
      bp: `BP${String(100000 + sequence)}`,
      code: `${prefix}${String(sequence).padStart(3, '0')}`,
    };
  }
}
