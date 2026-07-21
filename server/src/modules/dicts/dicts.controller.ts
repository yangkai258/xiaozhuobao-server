import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DictQuery, dictQuerySchema } from './dicts.schemas';
import { DictsService } from './dicts.service';

@ApiTags('字典')
@ApiBearerAuth()
@Controller('dicts')
export class DictsController {
  constructor(private readonly dictsService: DictsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600')
  @ApiOperation({ summary: '按类型获取字典' })
  findByKind(@Query(new ZodValidationPipe(dictQuerySchema)) query: DictQuery): Promise<unknown> {
    return this.dictsService.findByKind(query.kind);
  }
}
