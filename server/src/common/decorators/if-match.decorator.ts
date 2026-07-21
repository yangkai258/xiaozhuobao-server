import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiException } from '../filters/api.exception';
import { ApiRequest } from '../types';

export const IfMatchVersion = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number => {
    const raw = context.switchToHttp().getRequest<ApiRequest>().header('If-Match');
    const version = raw && /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
    if (!Number.isSafeInteger(version)) {
      throw new ApiException(40004, '缺少或无效的 If-Match header', 400);
    }
    return version;
  },
);
