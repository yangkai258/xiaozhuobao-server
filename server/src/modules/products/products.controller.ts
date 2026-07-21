import { Body, Controller, Get, Header, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IfMatchVersion } from '../../common/decorators/if-match.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  productIdentifierSchema,
  ProductQuery,
  productQuerySchema,
  StockAdjustment,
  stockAdjustmentSchema,
} from './products.schemas';
import { ProductsService } from './products.service';

@ApiTags('商品')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=60')
  @ApiOperation({ summary: '商品分页列表' })
  findMany(@Query(new ZodValidationPipe(productQuerySchema)) query: ProductQuery): Promise<unknown> {
    return this.productsService.findMany(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, max-age=60')
  findOne(@Param('id', new ZodValidationPipe(productIdentifierSchema)) id: string): Promise<unknown> {
    return this.productsService.findOne(id);
  }

  @Patch(':id/stock')
  @Roles(Role.REGION_MGR, Role.ADMIN)
  @ApiOperation({ summary: '增量调整商品库存' })
  adjustStock(
    @Param('id', new ZodValidationPipe(productIdentifierSchema)) id: string,
    @IfMatchVersion() version: number,
    @Body(new ZodValidationPipe(stockAdjustmentSchema)) body: StockAdjustment,
  ): Promise<unknown> {
    return this.productsService.adjustStock(id, version, body);
  }
}
