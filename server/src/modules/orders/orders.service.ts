import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { ApiException } from '../../common/filters/api.exception';
import { AuthenticatedUser } from '../../common/types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { canTransitionOrder } from './order-state-machine';
import { CreateOrderInput, OrderQuery, OrderStatusInput } from './orders.schemas';

const orderListSelect = {
  id: true,
  no: true,
  customerId: true,
  customer: { select: { name: true } },
  amtCents: true,
  status: true,
  qty: true,
  orderDate: true,
  expectedShipDate: true,
  version: true,
} satisfies Prisma.OrderSelect;

const orderDetailSelect = {
  ...orderListSelect,
  address: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      product: { select: { no: true, name: true, spec: true, unit: true } },
      qty: true,
      priceCents: true,
    },
  },
  logs: { select: { id: true, action: true, actor: true, at: true, remark: true }, orderBy: { at: 'asc' } },
} satisfies Prisma.OrderSelect;

type OrderListResult = Prisma.OrderGetPayload<{ select: typeof orderListSelect }>;
type OrderDetailResult = Prisma.OrderGetPayload<{ select: typeof orderDetailSelect }>;

const statusLabels: Record<OrderStatus, string> = {
  DRAFT: '草稿',
  PENDING_CONFIRM: '待确认',
  CONFIRMED: '已确认',
  SHIPPED: '已发货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: OrderQuery): Promise<unknown> {
    const where: Prisma.OrderWhereInput = {
      isDeleted: false,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.filter_status ? { status: query.filter_status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { no: { contains: query.keyword } },
              { customer: { name: { contains: query.keyword } } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            orderDate: {
              ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
              ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };
    const items = await this.prisma.order.findMany({
      where,
      select: orderListSelect,
      orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : { skip: (query.page - 1) * query.size }),
      take: query.size,
    });
    const total = await this.prisma.order.count({ where });
    return {
      items: items.map(this.serializeList),
      page: query.page,
      size: query.size,
      total,
      hasMore: items.length === query.size,
      nextCursor: items.length === query.size ? items.at(-1)?.id ?? null : null,
    };
  }

  async findOne(identifier: string): Promise<unknown> {
    const order = await this.findOrder(identifier);
    if (!order) {
      throw new ApiException(10404, `订单 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
    }
    return this.serializeDetail(order);
  }

  async create(input: CreateOrderInput, user: AuthenticatedUser): Promise<unknown> {
    const no = await this.nextNumber();
    try {
      const order = await this.prisma.$transaction(async (transaction) => {
        const customer = await transaction.customer.findFirst({
          where: { id: input.customerId, isDeleted: false },
          select: { id: true, status: true },
        });
        if (!customer) {
          throw new ApiException(10422, '关联客商不存在', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (customer.status === '已驳回' || customer.status === 'REJECTED') {
          throw new ApiException(10422, '客户已驳回，不可下单', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const products = await transaction.product.findMany({
          where: { id: { in: input.items.map((item) => item.productId) }, isDeleted: false },
          select: {
            id: true,
            name: true,
            priceCents: true,
            stock: true,
            reservedQty: true,
            version: true,
            isActive: true,
          },
        });
        if (products.length !== input.items.length) {
          throw new ApiException(10422, '订单包含不存在的商品', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        const productMap = new Map(products.map((product) => [product.id, product]));
        let amount = 0n;
        let totalQty = 0;
        for (const item of input.items) {
          const product = productMap.get(item.productId) as (typeof products)[number];
          if (!product.isActive) {
            throw new ApiException(10422, `商品 ${product.name} 已下架`, HttpStatus.UNPROCESSABLE_ENTITY);
          }
          if (product.stock - product.reservedQty < item.qty) {
            throw new ApiException(10422, `商品 ${product.name} 库存不足`, HttpStatus.UNPROCESSABLE_ENTITY);
          }
          const reserved = await transaction.product.updateMany({
            where: {
              id: product.id,
              version: product.version,
              reservedQty: product.reservedQty,
              stock: { gte: product.reservedQty + item.qty },
              isDeleted: false,
            },
            data: { reservedQty: { increment: item.qty }, version: { increment: 1 } },
          });
          if (reserved.count !== 1) {
            throw new ApiException(10422, `商品 ${product.name} 库存已被占用，请重试`, HttpStatus.UNPROCESSABLE_ENTITY);
          }
          amount += BigInt(product.priceCents) * BigInt(item.qty);
          totalQty += item.qty;
        }

        return transaction.order.create({
          data: {
            no,
            customerId: input.customerId,
            amtCents: amount,
            status: OrderStatus.DRAFT,
            qty: `${input.items.length} 行 · ${totalQty} 件`,
            orderDate: new Date(),
            expectedShipDate: input.expectedShipDate
              ? new Date(`${input.expectedShipDate}T00:00:00.000Z`)
              : null,
            address: input.address,
            createdById: user.id,
            version: 1,
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                qty: item.qty,
                priceCents: (productMap.get(item.productId) as (typeof products)[number]).priceCents,
              })),
            },
            logs: { create: { action: '创建订单', actor: user.displayName } },
          },
          select: orderDetailSelect,
        });
      });
      return this.serializeDetail(order);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiException(10002, '订单重复提交', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async updateStatus(
    identifier: string,
    version: number,
    input: OrderStatusInput,
    user: AuthenticatedUser,
  ): Promise<void> {
    const order = await this.findOrder(identifier);
    if (!order) {
      throw new ApiException(10404, `订单 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
    }
    if (order.version !== version) {
      throw new ApiException(10009, 'version 不匹配，请刷新后重试', HttpStatus.CONFLICT);
    }
    if (!canTransitionOrder(order.status, input.status, user.role, order.createdById === user.id)) {
      throw new ApiException(10008, '非法状态跃迁', HttpStatus.CONFLICT);
    }

    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.order.updateMany({
        where: { id: order.id, version, isDeleted: false },
        data: { status: input.status, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new ApiException(10009, 'version 不匹配，请刷新后重试', HttpStatus.CONFLICT);
      }

      for (const item of order.items) {
        if (input.status === OrderStatus.CANCELLED) {
          const data =
            order.status === OrderStatus.SHIPPED || order.status === OrderStatus.COMPLETED
              ? { stock: { increment: item.qty }, version: { increment: 1 } }
              : { reservedQty: { decrement: item.qty }, version: { increment: 1 } };
          await transaction.product.update({ where: { id: item.productId }, data });
        } else if (input.status === OrderStatus.SHIPPED) {
          const shipped = await transaction.product.updateMany({
            where: { id: item.productId, stock: { gte: item.qty }, reservedQty: { gte: item.qty } },
            data: {
              stock: { decrement: item.qty },
              reservedQty: { decrement: item.qty },
              version: { increment: 1 },
            },
          });
          if (shipped.count !== 1) {
            throw new ApiException(10422, '发货库存不足', HttpStatus.UNPROCESSABLE_ENTITY);
          }
        }
      }
      await transaction.orderLog.create({
        data: {
          orderId: order.id,
          action: `状态变更为 ${statusLabels[input.status]}`,
          actor: user.displayName,
          remark: input.remark,
        },
      });
    });
  }

  private findOrder(identifier: string): Promise<OrderDetailResult | null> {
    return this.prisma.order.findFirst({
      where: { OR: [{ id: identifier }, { no: identifier }], isDeleted: false },
      select: orderDetailSelect,
    });
  }

  private async nextNumber(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const prefix = `SO${date}-`;
    const latest = await this.prisma.order.findFirst({
      where: { no: { startsWith: prefix }, isDeleted: false },
      select: { no: true },
      orderBy: { no: 'desc' },
    });
    const sequence = latest ? Number(latest.no.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(sequence).padStart(3, '0')}`;
  }

  private readonly serializeList = (order: OrderListResult): Record<string, unknown> => {
    const { customer, status, ...rest } = order;
    return {
      ...rest,
      customerName: customer.name,
      amtCents: order.amtCents.toString(),
      status: statusLabels[status],
      statusCode: status,
      orderDate: order.orderDate.toISOString().slice(0, 10),
      expectedShipDate: order.expectedShipDate?.toISOString().slice(0, 10) ?? null,
    };
  };

  private readonly serializeDetail = (order: OrderDetailResult): unknown => {
    const { items, logs, ...summary } = order;
    return {
      ...this.serializeList(summary),
      address: order.address,
      createdById: order.createdById,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: items.map(({ product, ...item }) => ({
        ...item,
        productNo: product.no,
        productName: product.name,
        spec: product.spec,
        unit: product.unit,
        priceCents: String(item.priceCents),
      })),
      logs,
    };
  };
}
