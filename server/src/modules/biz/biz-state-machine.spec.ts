import { BizStatus } from '@prisma/client';
import { canTransitionBiz } from './biz-state-machine';

describe('business form state machine', () => {
  it('accepts documented transitions only', () => {
    expect(canTransitionBiz(BizStatus.DRAFT, BizStatus.PENDING)).toBe(true);
    expect(canTransitionBiz(BizStatus.PENDING, BizStatus.APPROVED)).toBe(true);
    expect(canTransitionBiz(BizStatus.CLOSED, BizStatus.PENDING)).toBe(false);
  });
});
