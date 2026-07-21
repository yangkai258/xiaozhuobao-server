import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../../common/types';
import { AuthService } from './auth.service';
import { LoginInput, loginSchema, RefreshInput, refreshSchema } from './auth.schemas';

@ApiTags('鉴权')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '账号密码登录' })
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput): Promise<unknown> {
    return this.authService.login(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新访问令牌' })
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput): Promise<unknown> {
    return this.authService.refresh(body);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户' })
  me(@CurrentUser() user: AuthenticatedUser): unknown {
    return this.authService.me(user);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: '退出登录' })
  logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.authService.logout(user.id);
  }
}
