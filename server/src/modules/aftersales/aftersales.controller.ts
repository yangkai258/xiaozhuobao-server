import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../../common/types';
import {
  aftersaleIdentifierSchema,
  AftersaleQuery,
  aftersaleQuerySchema,
  CreateAftersaleInput,
  createAftersaleSchema,
} from './aftersales.schemas';
import { AftersalesService } from './aftersales.service';

@ApiTags('售后')
@ApiBearerAuth()
@Controller('aftersales')
export class AftersalesController {
  constructor(private readonly aftersalesService: AftersalesService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=60')
  @ApiOperation({ summary: '售后分页列表' })
  findMany(@Query(new ZodValidationPipe(aftersaleQuerySchema)) query: AftersaleQuery): Promise<unknown> {
    return this.aftersalesService.findMany(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, max-age=60')
  findOne(@Param('id', new ZodValidationPipe(aftersaleIdentifierSchema)) id: string): Promise<unknown> {
    return this.aftersalesService.findOne(id);
  }

  @Post()
  @Roles(Role.SALES, Role.REGION_MGR, Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createAftersaleSchema)) body: CreateAftersaleInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    return this.aftersalesService.create(body, user);
  }
}
