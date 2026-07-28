import { HttpStatus, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiException } from '../filters/api.exception';
import { ApiRequest } from '../types';

// ponytail: v3.0.3 hardening ticket #10 - 'If-Match: *' returns the literal '*' so the
// downstream service can pick updateMany without a version: where (no 10009). Numbers are
// still validated; everything else throws 40002.
export type IfMatchHeader = number | '*';

export const IfMatchVersion = createParamDecorator(
  (_data: unknown, context: ExecutionContext): IfMatchHeader => {
    const raw = context.switchToHttp().getRequest<ApiRequest>().header('If-Match');
    if (raw === '*') return '*';
    const version = raw && /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
    if (!Number.isSafeInteger(version)) {
      // ponytail: v3.0.3 hardening ticket #9 - missing or unparseable If-Match now 40002
      // (v1.1 spec); the older 40004 collided with the Idempotency-Key format error.
      // ponytail: reviewer follow-up - use HttpStatus.BAD_REQUEST (not the literal 400) so
      // the value tracks NestJS enum renames and the response envelope is unambiguous.
      throw new ApiException(40002, '缺少或无效的 If-Match header', HttpStatus.BAD_REQUEST);
    }
    return version;
  },
);
