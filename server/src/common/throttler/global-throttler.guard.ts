import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
// ThrottlerLimitDetail is intentionally not imported: throttler 5.x does not re-export the
// interface from the package root. The override only needs to know it was throttled, so we
// accept the structural type via `unknown` and surface 20428 with the standard message.
import { ApiException } from '../filters/api.exception';

// ponytail: v3.0.3 hardening ticket #1 - throttler-fenced 429 must surface as business code 20428
// (global cap) instead of the default ThrottlerException that the filter would map to 20429.
// Path-level @Throttle() overrides (auth login/refresh, ai invoke) reuse 20429 via the filter.
@Injectable()
export class GlobalThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(_context: ExecutionContext, _detail: unknown): Promise<void> {
    throw new ApiException(20428, '请求过于频繁，请稍后再试', 429);
  }
}

