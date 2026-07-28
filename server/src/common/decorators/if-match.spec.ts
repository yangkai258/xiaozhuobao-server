import { ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IfMatchHeader, IfMatchVersion } from './if-match.decorator';

interface MockRequest {
  user?: { role: Role };
  header: (name: string) => string | undefined;
}

function makeCtx(rawHeader: string | undefined, role: Role | undefined): ExecutionContext {
  const req: MockRequest = {
    header: (name: string) => (name === 'If-Match' ? rawHeader : undefined),
    user: role ? { role } : undefined,
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('IfMatchVersion', () => {
  it('parses a numeric version', () => {
    const out: IfMatchHeader = IfMatchVersion(undefined, makeCtx('7', Role.SALES));
    expect(out).toBe(7);
  });

  it('throws 40002 when the header is missing', () => {
    expect(() => IfMatchVersion(undefined, makeCtx(undefined, Role.SALES))).toThrow(
      expect.objectContaining({ code: 40002 }),
    );
  });

  it('throws 40002 when the header is not a non-negative integer', () => {
    expect(() => IfMatchVersion(undefined, makeCtx('abc', Role.SALES))).toThrow(
      expect.objectContaining({ code: 40002 }),
    );
  });

  // ponytail: reviewer follow-up - SALES cannot use 'If-Match: *' to skip the version fence.
  it('throws 20103 when SALES sends If-Match: *', () => {
    expect(() => IfMatchVersion(undefined, makeCtx('*', Role.SALES))).toThrow(
      expect.objectContaining({ code: 20103 }),
    );
  });

  it('throws 20103 when REGION_MGR sends If-Match: *', () => {
    expect(() => IfMatchVersion(undefined, makeCtx('*', Role.REGION_MGR))).toThrow(
      expect.objectContaining({ code: 20103 }),
    );
  });

  it('returns "*" when ADMIN sends If-Match: *', () => {
    const out: IfMatchHeader = IfMatchVersion(undefined, makeCtx('*', Role.ADMIN));
    expect(out).toBe('*');
  });
});
