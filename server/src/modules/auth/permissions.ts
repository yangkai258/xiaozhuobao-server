import { Role } from '@prisma/client';

const permissions: Record<Role, string[]> = {
  SALES: ['customers:read', 'customers:write', 'orders:read', 'orders:write', 'aftersales:write'],
  REGION_MGR: ['customers:read', 'customers:write', 'orders:read', 'orders:write', 'reports:read'],
  FINANCE: ['customers:read', 'orders:read', 'approvals:write', 'reports:read'],
  ADMIN: ['*'],
};

export function permissionsFor(role: Role): string[] {
  return permissions[role];
}
