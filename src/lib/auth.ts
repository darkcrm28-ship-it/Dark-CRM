import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import type {} from "react/canary";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/session-token";
import type { Customer, Prisma } from "@prisma/client";

export { decrypt, encrypt } from "@/lib/session-token";

export const ROLE = {
  GENERAL_MANAGER: "GENERAL_MANAGER",
  SALES_MANAGER: "SALES_MANAGER",
  SALES_EMPLOYEE: "SALES_EMPLOYEE",
  HR_MANAGER: "HR_MANAGER",
  ACCOUNTING_MANAGER: "ACCOUNTING_MANAGER",
} as const;

export type AppRole = (typeof ROLE)[keyof typeof ROLE];
export type Session = { id: string; email: string; name: string; role: AppRole };

export const ALLOWED_ROLES = new Set<AppRole>(Object.values(ROLE));
export const SALES_ROLES: readonly AppRole[] = [ROLE.GENERAL_MANAGER, ROLE.SALES_MANAGER, ROLE.SALES_EMPLOYEE];
export const SALES_MANAGER_ROLES: readonly AppRole[] = [ROLE.GENERAL_MANAGER, ROLE.SALES_MANAGER];
export const FINANCE_ROLES: readonly AppRole[] = [ROLE.GENERAL_MANAGER, ROLE.ACCOUNTING_MANAGER];
export const HR_ROLES: readonly AppRole[] = [ROLE.GENERAL_MANAGER, ROLE.HR_MANAGER];
export const COMMISSION_ROLES: readonly AppRole[] = [ROLE.GENERAL_MANAGER, ROLE.HR_MANAGER, ROLE.ACCOUNTING_MANAGER];

const isNextResponse = (value: unknown): value is NextResponse => value instanceof NextResponse;

// Read the current account state and role from the database on every server-side
// session check. This makes deactivation and role changes effective immediately.
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  let payload: { id?: unknown; role?: unknown };
  try {
    payload = (await decrypt(token)) as { id?: unknown; role?: unknown };
  } catch {
    return null;
  }

  // Never trust role or any authority claim embedded in the client-supplied token.
  // The token may only carry an identity hint; every authority decision must be
  // re-verified against the database below.
  if (typeof payload.id !== "string" || !payload.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;
  if (!ALLOWED_ROLES.has(user.role as AppRole)) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role as AppRole };
}

// React can memoize this for a single Server Component render. API authorization
// still reads the current account state and never uses a cross-request cache.
export const getPageSession = typeof cache === "function" ? cache(getSession) : getSession;

export async function requireSession(): Promise<Session | NextResponse> {
  const session = await getSession();
  return session ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function requireRole(roles: readonly AppRole[]): Promise<Session | NextResponse> {
  const session = await requireSession();
  if (isNextResponse(session)) return session;
  if (!roles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

export async function requireManager(): Promise<Session | NextResponse> {
  return requireRole(SALES_MANAGER_ROLES);
}

export async function requirePageRole(roles: readonly AppRole[]): Promise<Session> {
  const session = await getPageSession();
  if (!session) redirect("/login");
  if (!roles.includes(session.role)) {
    if (session.role === ROLE.HR_MANAGER) redirect("/dashboard/commissions");
    if (session.role === ROLE.ACCOUNTING_MANAGER) redirect("/dashboard/accounting");
    redirect("/dashboard");
  }
  return session;
}

export async function requireCustomerAccess(
  customerId: string
): Promise<{ session: Session; customer: Customer; where: Prisma.CustomerWhereInput } | NextResponse> {
  const session = await requireRole(SALES_ROLES);
  if (isNextResponse(session)) return session;

  const where: Prisma.CustomerWhereInput = session.role === ROLE.SALES_EMPLOYEE
    ? { id: customerId, assignedToId: session.id }
    : { id: customerId };
  const customer = await prisma.customer.findFirst({ where });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  return { session, customer, where };
}

// Legacy helper retained for compatibility with any existing caller.
export async function updateSession(request: any) {
  const token = request.cookies.get("session")?.value;
  if (!token) return;

  let payload: { id?: unknown };
  try {
    payload = (await decrypt(token)) as { id?: unknown };
  } catch {
    return;
  }

  // Re-issue the token only if the account still exists and is active. This
  // rolls the session forward immediately when a role change or deactivation
  // happens, instead of letting a stale token live until its original expiry.
  if (typeof payload.id !== "string" || !payload.id) return;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive || !ALLOWED_ROLES.has(user.role as AppRole)) {
    const response = NextResponse.next();
    response.cookies.delete("session");
    return response;
  }

  const response = NextResponse.next();
  response.cookies.set({
    name: "session",
    value: await encrypt({ id: user.id, role: user.role }),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
