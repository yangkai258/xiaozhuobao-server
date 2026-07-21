import { BizStatus } from '@prisma/client';

const transitions: Record<BizStatus, BizStatus[]> = {
  DRAFT: [BizStatus.PENDING, BizStatus.REJECTED],
  PENDING: [BizStatus.APPROVED, BizStatus.REJECTED],
  APPROVED: [BizStatus.CLOSED, BizStatus.REJECTED],
  REJECTED: [],
  CLOSED: [],
};

export function canTransitionBiz(from: BizStatus, to: BizStatus): boolean {
  return transitions[from].includes(to);
}
