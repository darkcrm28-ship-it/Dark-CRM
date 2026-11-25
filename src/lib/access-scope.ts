import type { Prisma } from "@prisma/client";
import type { AppRole, Session } from "@/lib/auth";
import { ROLE } from "@/lib/auth";

/**
 * Centralized data-access scope helpers.
 *
 * Goal: avoid repeating role-based where-clause logic across routes.
 * This file is additive; routes can adopt it incrementally.
 */

export function isManagerRole(role: AppRole): boolean {
  return role === ROLE.GENERAL_MANAGER || role === ROLE.SALES_MANAGER;
}

export function canAccessAllCustomers(role: AppRole): boolean {
  return isManagerRole(role);
}

export function customerScopeWhere(session: Session): Prisma.CustomerWhereInput {
  if (session.role === ROLE.SALES_EMPLOYEE) {
    return { assignedToId: session.id };
  }
  if (canAccessAllCustomers(session.role)) {
    return {};
  }
  // Non-sales roles should not receive customer scope by default.
  return { id: "__no_access__" };
}

export function scopedCustomerWhere(
  session: Session,
  where: Prisma.CustomerWhereInput = {},
): Prisma.CustomerWhereInput {
  const scope = customerScopeWhere(session);
  return Object.keys(scope).length ? { AND: [scope, where] } : where;
}

export function dealScopeWhere(session: Session): Prisma.DealWhereInput {
  if (session.role === ROLE.SALES_EMPLOYEE) {
    return { salesRepId: session.id };
  }
  if (isManagerRole(session.role)) {
    return {};
  }
  return { id: "__no_access__" };
}

export function scopedDealWhere(
  session: Session,
  where: Prisma.DealWhereInput = {},
): Prisma.DealWhereInput {
  const scope = dealScopeWhere(session);
  return Object.keys(scope).length ? { AND: [scope, where] } : where;
}

export function reminderScopeWhere(session: Session): Prisma.ReminderWhereInput {
  if (session.role === ROLE.SALES_EMPLOYEE) {
    return {
      OR: [
        { userId: session.id },
        { customer: { assignedToId: session.id } },
      ],
    };
  }
  if (isManagerRole(session.role)) return {};
  return { id: "__no_access__" };
}

export function assertCanAccessAssignedCustomer(
  session: Session,
  customer: { assignedToId: string | null },
): boolean {
  if (canAccessAllCustomers(session.role)) return true;
  if (session.role === ROLE.SALES_EMPLOYEE) return customer.assignedToId === session.id;
  return false;
}
