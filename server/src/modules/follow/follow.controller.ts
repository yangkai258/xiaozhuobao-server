import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../../common/types';
import {
  cancelFollowSchema,
  completeFollowSchema,
  followIdentifierSchema,
  FollowQuery,
  followQuerySchema,
} from './follow.schemas';
import { FollowService } from './follow.service';

@ApiTags('跟进与待办')
@ApiBearerAuth()
@Controller('follow/todos')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Get()
  @ApiOperation({ summary: '当前用户待办' })
  findTodos(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(followQuerySchema)) query: FollowQuery,
  ): Promise<unknown> {
    return this.followService.findTodos(user.id, query);
  }

  @Post(':id/done')
  @HttpCode(204)
  complete(
    @Param('id', new ZodValidationPipe(followIdentifierSchema)) id: string,
    @Body(new ZodValidationPipe(completeFollowSchema)) _body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.followService.complete(id, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(204)
  cancel(
    @Param('id', new ZodValidationPipe(followIdentifierSchema)) id: string,
    @Body(new ZodValidationPipe(cancelFollowSchema)) _body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.followService.cancel(id, user.id);
  }
}
