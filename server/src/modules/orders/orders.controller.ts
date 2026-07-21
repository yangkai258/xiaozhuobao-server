import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IfMatchVersion } from '../../common/decorators/if-match.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../../common/types';
import {
  CreateOrderInput,
  createOrderSchema,
  orderIdentifierSchema,
  OrderQuery,
  orderQuerySchema,
  OrderStatusInput,
  orderStatusSchema,
} from './orders.schemas';
import { OrdersService } from './orders.service';

@ApiTags('订单')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=60')
  @ApiOperation({ summary: '订单分页列表' })
  findMany(@Query(new ZodValidationPipe(orderQuerySchema)) query: OrderQuery): Promise<unknown> {
    return this.ordersService.findMany(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, max-age=60')
  findOne(@Param('id', new ZodValidationPipe(orderIdentifierSchema)) id: string): Promise<unknown> {
    return this.ordersService.findOne(id);
  }

  @Post()
  @Roles(Role.SALES, Role.REGION_MGR, Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    return this.ordersService.create(body, user);
  }

  @Patch(':id/status')
  @HttpCode(204)
  @Roles(Role.SALES, Role.REGION_MGR, Role.ADMIN)
  updateStatus(
    @Param('id', new ZodValidationPipe(orderIdentifierSchema)) id: string,
    @IfMatchVersion() version: number,
    @Body(new ZodValidationPipe(orderStatusSchema)) body: OrderStatusInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.ordersService.updateStatus(id, version, body, user);
  }
}
