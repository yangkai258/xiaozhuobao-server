import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiException } from '../filters/api.exception';
import { ApiRequest } from '../types';

export const IfMatchVersion = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number => {
    const raw = context.switchToHttp().getRequest<ApiRequest>().header('If-Match');
    const version = raw && /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
    if (!Number.isSafeInteger(version)) {
      // ponytail: v3.0.3 hardening ticket #9 - missing or unparseable If-Match now 40002
      // (v1.1 spec); the older 40004 collided with the Idempotency-Key format error.
      throw new ApiException(40002, '缺少或无效的 If-Match header', 400);
    }
    return version;
  },
);
