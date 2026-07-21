import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BizKind, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IfMatchVersion } from '../../common/decorators/if-match.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../../common/types';
import {
  bizIdentifierSchema,
  bizKindSchema,
  BizQuery,
  bizQuerySchema,
  BizStatusInput,
  bizStatusSchema,
} from './biz.schemas';
import { BizService } from './biz.service';

@ApiTags('业务表单')
@ApiBearerAuth()
@Controller('biz')
export class BizController {
  constructor(private readonly bizService: BizService) {}

  @Get()
  @ApiOperation({ summary: '业务表单分页列表' })
  findMany(@Query(new ZodValidationPipe(bizQuerySchema)) query: BizQuery): Promise<unknown> {
    return this.bizService.findMany(query);
  }

  @Get(':id')
  findOne(@Param('id', new ZodValidationPipe(bizIdentifierSchema)) id: string): Promise<unknown> {
    return this.bizService.findOne(id);
  }

  @Post(':kind')
  @Roles(Role.SALES, Role.REGION_MGR, Role.ADMIN)
  create(
    @Param('kind', new ZodValidationPipe(bizKindSchema)) kind: BizKind,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    return this.bizService.create(kind, body, user.id);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id', new ZodValidationPipe(bizIdentifierSchema)) id: string,
    @IfMatchVersion() version: number,
    @Body(new ZodValidationPipe(bizStatusSchema)) body: BizStatusInput,
  ): Promise<unknown> {
    return this.bizService.updateStatus(id, version, body);
  }
}
