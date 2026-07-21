import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashPassword } from './password';

describe('AuthService', () => {
  it('returns tokens and stores only the refresh token hash', async () => {
    const user = {
      id: 'u_001',
      username: 'zhangming',
      passwordHash: await hashPassword('Xzb@2026!'),
      displayName: '张明',
      avatarUrl: null,
      role: Role.SALES,
      region: '上海',
      isActive: true,
      refreshTokenHash: null,
      refreshTokenExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };
    let storedRefreshTokenHash = '';
    const update = jest.fn(
      (input: { data: { refreshTokenHash: string } }): Promise<typeof user> => {
        storedRefreshTokenHash = input.data.refreshTokenHash;
        return Promise.resolve(user);
      },
    );
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update,
      },
    } as unknown as PrismaService;
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    } as unknown as JwtService;
    const config = {
      getOrThrow: jest.fn((key: string) => (key === 'JWT_ACCESS_TTL' ? 900 : 604800)),
    } as unknown as ConfigService;
    const service = new AuthService(prisma, jwtService, config);

    const result = (await service.login({
      username: 'zhangming',
      password: 'Xzb@2026!',
    })) as { refreshToken: string };

    expect(result.refreshToken).toMatch(/^tk_[A-Za-z0-9_-]{43}$/);
    expect(update).toHaveBeenCalledTimes(1);
    expect(storedRefreshTokenHash).toHaveLength(64);
    expect(storedRefreshTokenHash).not.toContain('tk_');
  });
});
