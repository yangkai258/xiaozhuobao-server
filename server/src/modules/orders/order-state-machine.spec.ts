import { OrderStatus, Role } from '@prisma/client';
import { canTransitionOrder } from './order-state-machine';

describe('order state machine', () => {
  it('allows the creator to submit and blocks skipped states', () => {
    expect(canTransitionOrder(OrderStatus.DRAFT, OrderStatus.PENDING_CONFIRM, Role.SALES, true)).toBe(true);
    expect(canTransitionOrder(OrderStatus.DRAFT, OrderStatus.SHIPPED, Role.SALES, true)).toBe(false);
  });

  it('allows managers to cancel any non-cancelled state', () => {
    expect(canTransitionOrder(OrderStatus.COMPLETED, OrderStatus.CANCELLED, Role.REGION_MGR, false)).toBe(true);
    expect(canTransitionOrder(OrderStatus.CANCELLED, OrderStatus.CANCELLED, Role.ADMIN, false)).toBe(false);
  });
});
