import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../../common/types';
import { AiService } from './ai.service';
import { AiModuleId, aiModuleSchema, InvokeAiInput, invokeAiSchema } from './ai.schemas';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('modules')
  @ApiOperation({ summary: 'AI 模块列表' })
  listModules(): readonly unknown[] {
    return this.aiService.listModules();
  }

  // ponytail: v3.0.3 hardening ticket #1 - RATE_LIMIT_AI default 60/min/IP; service layer
  // additionally enforces per-user token-bucket via assertRateLimit in ticket #4.
  @Throttle({ global: { limit: 60, ttl: 60_000 } })
  @Post(':module/invoke')
  invoke(
    @Param('module', new ZodValidationPipe(aiModuleSchema)) module: AiModuleId,
    @Body(new ZodValidationPipe(invokeAiSchema)) body: InvokeAiInput,
    @CurrentUser() user: AuthenticatedUser,
  ): unknown {
    return this.aiService.invoke(module, body, user.id);
  }

  @Get(':module/history')
  history(
    @Param('module', new ZodValidationPipe(aiModuleSchema)) module: AiModuleId,
    @CurrentUser() user: AuthenticatedUser,
  ): unknown[] {
    return this.aiService.history(module, user.id);
  }
}
