import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeatureService } from './feature.service';

@ApiTags('功能开关')
@ApiBearerAuth()
@Controller('feature')
export class FeatureController {
  constructor(private readonly features: FeatureService) {}

  @Get()
  @ApiOperation({ summary: '读取当前生效的功能开关' })
  list(): Record<string, boolean> {
    return this.features.snapshot();
  }
}
