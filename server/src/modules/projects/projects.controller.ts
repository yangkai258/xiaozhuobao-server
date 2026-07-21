import { Body, Controller, Get, Header, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IfMatchVersion } from '../../common/decorators/if-match.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  projectIdentifierSchema,
  ProjectPayload,
  projectPayloadSchema,
  ProjectQuery,
  projectQuerySchema,
  ProjectUpdate,
  projectUpdateSchema,
} from './projects.schemas';
import { ProjectsService } from './projects.service';

@ApiTags('项目')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=60')
  @ApiOperation({ summary: '项目分页列表' })
  findMany(@Query(new ZodValidationPipe(projectQuerySchema)) query: ProjectQuery): Promise<unknown> {
    return this.projectsService.findMany(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, max-age=60')
  findOne(@Param('id', new ZodValidationPipe(projectIdentifierSchema)) id: string): Promise<unknown> {
    return this.projectsService.findOne(id);
  }

  @Post()
  @Roles(Role.SALES, Role.REGION_MGR, Role.ADMIN)
  create(@Body(new ZodValidationPipe(projectPayloadSchema)) body: ProjectPayload): Promise<unknown> {
    return this.projectsService.create(body);
  }

  @Patch(':id')
  @Roles(Role.SALES, Role.REGION_MGR, Role.ADMIN)
  update(
    @Param('id', new ZodValidationPipe(projectIdentifierSchema)) id: string,
    @IfMatchVersion() version: number,
    @Body(new ZodValidationPipe(projectUpdateSchema)) body: ProjectUpdate,
  ): Promise<unknown> {
    return this.projectsService.update(id, version, body);
  }
}
