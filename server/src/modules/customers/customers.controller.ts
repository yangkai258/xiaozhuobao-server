import { Body, Controller, Get, Header, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IfMatchVersion } from '../../common/decorators/if-match.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../../common/types';
import {
  customerIdentifierSchema,
  CustomerPayload,
  customerPayloadSchema,
  CustomerQuery,
  customerQuerySchema,
  CustomerUpdate,
  customerUpdateSchema,
} from './customers.schemas';
import { CustomersService } from './customers.service';

@ApiTags('客商')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=60')
  @ApiOperation({ summary: '客商分页列表' })
  findMany(
    @Query(new ZodValidationPipe(customerQuerySchema)) query: CustomerQuery,
  ): Promise<unknown> {
    return this.customersService.findMany(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, max-age=60')
  @ApiOperation({ summary: '客商详情' })
  findOne(
    @Param('id', new ZodValidationPipe(customerIdentifierSchema)) id: string,
  ): Promise<unknown> {
    return this.customersService.findOne(id);
  }

  @Post()
  @Roles(Role.SALES, Role.REGION_MGR, Role.ADMIN)
  @ApiOperation({ summary: '新建客商' })
  create(
    @Body(new ZodValidationPipe(customerPayloadSchema)) body: CustomerPayload,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    return this.customersService.create(body, user.id);
  }

  @Patch(':id')
  @Roles(Role.SALES, Role.REGION_MGR, Role.ADMIN)
  @ApiOperation({ summary: '编辑客商' })
  update(
    @Param('id', new ZodValidationPipe(customerIdentifierSchema)) id: string,
    @IfMatchVersion() version: number,
    @Body(new ZodValidationPipe(customerUpdateSchema)) body: CustomerUpdate,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    return this.customersService.update(id, version, body, user.id);
  }
}
