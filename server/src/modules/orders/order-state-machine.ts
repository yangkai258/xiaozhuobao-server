import { OrderStatus, Role } from '@prisma/client';

interface Transition {
  to: OrderStatus;
  roles: Role[];
  creatorOnly?: boolean;
}

const transitions: Record<OrderStatus, Transition[]> = {
  DRAFT: [
    { to: OrderStatus.PENDING_CONFIRM, roles: [Role.SALES, Role.REGION_MGR, Role.ADMIN], creatorOnly: true },
    { to: OrderStatus.CANCELLED, roles: [Role.REGION_MGR, Role.ADMIN] },
  ],
  PENDING_CONFIRM: [
    { to: OrderStatus.CONFIRMED, roles: [Role.SALES, Role.REGION_MGR, Role.ADMIN], creatorOnly: true },
    { to: OrderStatus.CANCELLED, roles: [Role.SALES, Role.REGION_MGR, Role.ADMIN], creatorOnly: true },
  ],
  CONFIRMED: [
    { to: OrderStatus.SHIPPED, roles: [Role.ADMIN] },
    { to: OrderStatus.CANCELLED, roles: [Role.REGION_MGR, Role.ADMIN] },
  ],
  SHIPPED: [
    { to: OrderStatus.COMPLETED, roles: [Role.SALES, Role.REGION_MGR, Role.ADMIN], creatorOnly: true },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
  role: Role,
  isCreator: boolean,
): boolean {
  if (
    to === OrderStatus.CANCELLED &&
    from !== OrderStatus.CANCELLED &&
    (role === Role.REGION_MGR || role === Role.ADMIN)
  ) {
    return true;
  }
  const transition = transitions[from].find((candidate) => candidate.to === to);
  if (!transition || !transition.roles.includes(role)) {
    return false;
  }
  return !transition.creatorOnly || isCreator || role === Role.REGION_MGR || role === Role.ADMIN;
}
