import { Role } from '@prisma/client';
import { IfMatchHeader, resolveIfMatchHeader } from './if-match.decorator';
import { ApiRequest } from '../types';

interface MockRequest {
  user?: { role: Role };
  header: (name: string) => string | undefined;
}

function makeReq(rawHeader: string | undefined, role: Role | undefined): ApiRequest {
  return {
    header: (name: string) => (name === 'If-Match' ? rawHeader : undefined),
    user: role ? { role } : undefined,
  } as unknown as ApiRequest;
}

describe('resolveIfMatchHeader', () => {
  it('parses a numeric version', () => {
    expect(resolveIfMatchHeader(makeReq('7', Role.SALES))).toBe(7);
  });

  it('throws 40002 when the header is missing', () => {
    expect(() => resolveIfMatchHeader(makeReq(undefined, Role.SALES))).toThrow(
      expect.objectContaining({ code: 40002 }),
    );
  });

  it('throws 40002 when the header is not a non-negative integer', () => {
    expect(() => resolveIfMatchHeader(makeReq('abc', Role.SALES))).toThrow(
      expect.objectContaining({ code: 40002 }),
    );
  });

  // ponytail: reviewer follow-up - SALES cannot use 'If-Match: *' to skip the version fence.
  it('throws 20103 when SALES sends If-Match: *', () => {
    expect(() => resolveIfMatchHeader(makeReq('*', Role.SALES))).toThrow(
      expect.objectContaining({ code: 20103 }),
    );
  });

  it('throws 20103 when REGION_MGR sends If-Match: *', () => {
    expect(() => resolveIfMatchHeader(makeReq('*', Role.REGION_MGR))).toThrow(
      expect.objectContaining({ code: 20103 }),
    );
  });

  it('returns "*" when ADMIN sends If-Match: *', () => {
    const out: IfMatchHeader = resolveIfMatchHeader(makeReq('*', Role.ADMIN));
    expect(out).toBe('*');
  });
});
