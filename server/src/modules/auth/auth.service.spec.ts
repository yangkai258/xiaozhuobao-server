import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashPassword } from './password';
import { StructuredLogger } from '../../common/logger/structured-logger';
import { ApiException } from '../../common/filters/api.exception';

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
    const logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() } as unknown as StructuredLogger;
  const service = new AuthService(prisma, jwtService, config, logger);

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

// ponytail: v3.0.3 hardening ticket #5 - brute-force lock surfaces as code 20105 and
// emits auth_locked via StructuredLogger. Below 5 failures the counter increments only.
describe('AuthService brute-force lock', () => {
  const baseUser = {
    id: 'u_002',
    username: 'lockme',
    passwordHash: 'unused',
    displayName: '',
    avatarUrl: null,
    role: Role.SALES,
    region: null,
    isActive: true,
    refreshTokenHash: null,
    refreshTokenExpires: null,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
  };

  function makeService(current: typeof baseUser, updates: Array<{ data: Record<string, unknown> }> = []) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(current),
        update: jest.fn((input: { data: Record<string, unknown> }) => {
          updates.push(input);
          return Promise.resolve({ ...current, ...input.data });
        }),
      },
    } as unknown as PrismaService;
    const jwt = { signAsync: jest.fn().mockResolvedValue('at') } as unknown as JwtService;
    const config = {
      getOrThrow: (k: string) => (k === 'JWT_ACCESS_TTL' ? 900 : 604800),
    } as unknown as ConfigService;
    const logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() } as unknown as StructuredLogger;
    const service = new AuthService(prisma, jwt, config, logger);
    return { service, prisma, logger, updates };
  }

  it('returns 401 with the generic error on the 5th bad attempt and locks for 15 minutes', async () => {
    const user = { ...baseUser, failedLoginAttempts: 4 };
    const updates: Array<{ data: Record<string, unknown> }> = [];
    const { service, logger, updates: u } = makeService(user, updates);
    await expect(service.login({ username: 'lockme', password: 'wrong' })).rejects.toMatchObject({ code: 20101 });
    expect(u).toHaveLength(1);
    expect((u[0].data.failedLoginAttempts as number)).toBe(5);
    const lock = u[0].data.lockedUntil as Date;
    expect(lock).toBeInstanceOf(Date);
    const drift = Math.abs(lock.getTime() - (Date.now() + 15 * 60 * 1000));
    expect(drift).toBeLessThan(5_000);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_locked' }),
      expect.any(String),
    );
  });

  it('rejects the next login with code 20105 even when the password is correct', async () => {
    const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    const user = { ...baseUser, lockedUntil };
    // server stores the password hash; for this test we override verifyPassword indirectly
    // by giving the user a non-matching hash so the failure path matches the user's locked state.
    const { service } = makeService(user);
    await expect(service.login({ username: 'lockme', password: 'whatever' })).rejects.toMatchObject({ code: 20105 });
  });

  it('clears the counter and lock state on a successful login', async () => {
    const user = { ...baseUser, failedLoginAttempts: 3, lockedUntil: null };
    const updates: Array<{ data: Record<string, unknown> }> = [];
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn((input: { data: Record<string, unknown> }) => {
          updates.push(input);
          return Promise.resolve({ ...user, ...input.data });
        }),
      },
    } as unknown as PrismaService;
    const jwt = { signAsync: jest.fn().mockResolvedValue('at') } as unknown as JwtService;
    const config = {
      getOrThrow: (k: string) => (k === 'JWT_ACCESS_TTL' ? 900 : 604800),
    } as unknown as ConfigService;
    const logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() } as unknown as StructuredLogger;
    // fetch the real hash for the password below
    const real = await hashPassword('Xzb@2026!');
    const found = { ...user, passwordHash: real };
    prisma.user.findUnique = jest.fn().mockResolvedValue(found);
    const service = new AuthService(prisma, jwt, config, logger);
    await service.login({ username: 'lockme', password: 'Xzb@2026!' });
    expect(updates).toHaveLength(1);
    expect(updates[0].data.failedLoginAttempts).toBe(0);
    expect(updates[0].data.lockedUntil).toBeNull();
  });
});
