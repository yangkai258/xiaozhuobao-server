import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../../common/types';
import { MeService } from './me.service';
import { ReportQuery, reportQuerySchema } from './me.schemas';

@ApiTags('我的')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: '我的信息' })
  profile(@CurrentUser() user: AuthenticatedUser): unknown {
    return this.meService.profile(user);
  }

  @Get('reports')
  @Header('Cache-Control', 'private, no-cache')
  reports(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQuery,
  ): Promise<unknown> {
    return this.meService.reports(user.id, query);
  }

  @Get('utilities')
  utilities(): unknown[] {
    return this.meService.utilities();
  }
}
