import { Body, Controller, Get, Header, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IfMatchVersion } from '../../common/decorators/if-match.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  contractIdentifierSchema,
  ContractPayload,
  contractPayloadSchema,
  ContractQuery,
  contractQuerySchema,
  ContractUpdate,
  contractUpdateSchema,
} from './contracts.schemas';
import { ContractsService } from './contracts.service';

@ApiTags('合同')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=60')
  @ApiOperation({ summary: '合同分页列表' })
  findMany(@Query(new ZodValidationPipe(contractQuerySchema)) query: ContractQuery): Promise<unknown> {
    return this.contractsService.findMany(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, max-age=60')
  findOne(@Param('id', new ZodValidationPipe(contractIdentifierSchema)) id: string): Promise<unknown> {
    return this.contractsService.findOne(id);
  }

  @Post()
  @Roles(Role.SALES, Role.REGION_MGR, Role.ADMIN)
  create(@Body(new ZodValidationPipe(contractPayloadSchema)) body: ContractPayload): Promise<unknown> {
    return this.contractsService.create(body);
  }

  @Patch(':id')
  @Roles(Role.SALES, Role.REGION_MGR, Role.ADMIN)
  update(
    @Param('id', new ZodValidationPipe(contractIdentifierSchema)) id: string,
    @IfMatchVersion() version: number,
    @Body(new ZodValidationPipe(contractUpdateSchema)) body: ContractUpdate,
  ): Promise<unknown> {
    return this.contractsService.update(id, version, body);
  }
}
