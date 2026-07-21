import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiException } from '../../common/filters/api.exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ProductQuery, StockAdjustment } from './products.schemas';

const productSelect = {
  id: true,
  no: true,
  name: true,
  spec: true,
  cat: true,
  stock: true,
  reservedQty: true,
  priceCents: true,
  unit: true,
  isActive: true,
  isDeleted: true,
  version: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

type ProductResult = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ProductQuery): Promise<unknown> {
    const where: Prisma.ProductWhereInput = {
      isDeleted: false,
      ...(query.filter_cat ? { cat: query.filter_cat } : {}),
      ...(query.active === undefined ? {} : { isActive: query.active }),
      ...(query.keyword
        ? {
            OR: [
              { no: { contains: query.keyword } },
              { name: { contains: query.keyword } },
              { spec: { contains: query.keyword } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.size,
        take: query.size,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: items.map(this.serialize),
      page: query.page,
      size: query.size,
      total,
      hasMore: query.page * query.size < total,
    };
  }

  async findOne(identifier: string): Promise<unknown> {
    const product = await this.findProduct(identifier);
    if (!product) {
      throw new ApiException(10404, `商品 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
    }
    return this.serialize(product);
  }

  async adjustStock(identifier: string, version: number, input: StockAdjustment): Promise<unknown> {
    const product = await this.findProduct(identifier);
    if (!product) {
      throw new ApiException(10404, `商品 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
    }
    if (product.version !== version) {
      throw new ApiException(10009, 'version 不匹配，请刷新后重试', HttpStatus.CONFLICT);
    }
    if (product.stock + input.stockDelta < 0) {
      throw new ApiException(10422, '库存不可为负', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const updated = await this.prisma.product.updateMany({
      where: {
        id: product.id,
        version,
        isDeleted: false,
        ...(input.stockDelta < 0 ? { stock: { gte: -input.stockDelta } } : {}),
      },
      data: { stock: { increment: input.stockDelta }, version: { increment: 1 } },
    });
    if (updated.count === 0) {
      throw new ApiException(10009, 'version 不匹配，请刷新后重试', HttpStatus.CONFLICT);
    }
    const result = await this.findProduct(identifier);
    return this.serialize(result as ProductResult);
  }

  private findProduct(identifier: string): Promise<ProductResult | null> {
    return this.prisma.product.findFirst({
      where: { OR: [{ id: identifier }, { no: identifier }], isDeleted: false },
      select: productSelect,
    });
  }

  private readonly serialize = (product: ProductResult): unknown => ({
    ...product,
    priceCents: String(product.priceCents),
  });
}
