import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { ApiException } from '../../common/filters/api.exception';
import { AuthenticatedUser, JwtPayload } from '../../common/types';
import { StructuredLogger } from '../../common/logger/structured-logger';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { LoginInput, RefreshInput } from './auth.schemas';
import { permissionsFor } from './permissions';
import { verifyPassword } from './password';

const authUserSelect = {
  id: true,
  username: true,
  passwordHash: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  region: true,
  isActive: true,
  refreshTokenHash: true,
  refreshTokenExpires: true,
  failedLoginAttempts: true,
  lockedUntil: true,
} satisfies Prisma.UserSelect;

type AuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly logger: StructuredLogger,
  ) {}

  async login(input: LoginInput): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { username: input.username },
      select: authUserSelect,
    });

    // ponytail: v3.0.3 hardening ticket #5 - check brute-force lock BEFORE the password so a
    // locked account surfaces 20105 immediately, regardless of the password the caller sent.
    if (user && user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ApiException(20105, '账号已锁定，请 15 分钟后再试', HttpStatus.UNAUTHORIZED);
    }
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      if (user) {
        const lockedUntil = await this.recordFailedLogin(user);
        if (lockedUntil) {
          // ponytail: v3.0.3 hardening ticket #5 - emit a structured event the SOC feed can
          // consume. The 20105 response still surfaces to the client; this is for ops only.
          this.logger.warn({ event: 'auth_locked', username: user.username, lockedUntil: lockedUntil.toISOString() }, AuthService.name);
        }
      }
      throw new ApiException(20101, '用户名或密码错误', HttpStatus.UNAUTHORIZED);
    }
    if (!user.isActive) {
      throw new ApiException(20102, '账号已禁用', HttpStatus.UNAUTHORIZED);
    }

    const tokenPair = await this.createTokenPair(user);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: tokenPair.refreshTokenHash,
        refreshTokenExpires: tokenPair.refreshTokenExpires,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        version: { increment: 1 },
      },
    });
    return this.authResponse(user, tokenPair);
  }

  async refresh(input: RefreshInput): Promise<unknown> {
    const currentHash = this.hashRefreshToken(input.refreshToken);
    const now = new Date();
    const user = await this.prisma.user.findFirst({
      where: {
        refreshTokenHash: currentHash,
        refreshTokenExpires: { gt: now },
        isActive: true,
      },
      select: authUserSelect,
    });
    if (!user) {
      throw new ApiException(20104, 'refreshToken 无效或已过期', HttpStatus.UNAUTHORIZED);
    }

    const tokenPair = await this.createTokenPair(user);
    const rotated = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        refreshTokenHash: currentHash,
        refreshTokenExpires: { gt: now },
      },
      data: {
        refreshTokenHash: tokenPair.refreshTokenHash,
        refreshTokenExpires: tokenPair.refreshTokenExpires,
      },
    });
    if (rotated.count !== 1) {
      throw new ApiException(20104, 'refreshToken 已使用', HttpStatus.UNAUTHORIZED);
    }
    return this.authResponse(user, tokenPair);
  }

  me(user: AuthenticatedUser): AuthenticatedUser & { permissions: string[] } {
    return { ...user, permissions: permissionsFor(user.role) };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpires: null },
    });
  }

  // ponytail: v3.0.3 hardening ticket #5 - returns the new lockedUntil when this attempt is the
  // 5th consecutive failure (so callers can emit auth_locked). Anything below the threshold
  // returns null and the user stays unlocked.
  private async recordFailedLogin(user: AuthUser): Promise<Date | null> {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const lockedUntil = failedLoginAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts, lockedUntil },
    });
    return lockedUntil;
  }

  private async createTokenPair(user: AuthUser): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshTokenHash: string;
    refreshTokenExpires: Date;
  }> {
    const accessTokenTtl = this.config.getOrThrow<number>('JWT_ACCESS_TTL');
    const refreshTokenTtl = this.config.getOrThrow<number>('JWT_REFRESH_TTL');
    const payload: JwtPayload = { sub: user.id, role: user.role, region: user.region };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: accessTokenTtl });
    const refreshToken = `tk_${randomBytes(32).toString('base64url')}`;
    return {
      accessToken,
      refreshToken,
      refreshTokenHash: this.hashRefreshToken(refreshToken),
      refreshTokenExpires: new Date(Date.now() + refreshTokenTtl * 1000),
    };
  }

  private authResponse(
    user: AuthUser,
    tokenPair: { accessToken: string; refreshToken: string },
  ): unknown {
    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      accessTokenExpiresIn: this.config.getOrThrow<number>('JWT_ACCESS_TTL'),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        region: user.region,
      },
    };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
