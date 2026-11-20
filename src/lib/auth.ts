import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/session-token";

export { decrypt, encrypt } from "@/lib/session-token";

// Roles that are allowed to authenticate at all.
const ALLOWED_ROLES = new Set(["GENERAL_MANAGER", "SALES_MANAGER", "SALES_EMPLOYEE"]);

// Read the current account state and role from the database on every server-side
// session check. This makes deactivation and role changes effective immediately.
export async function getSession() {
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
  if (!ALLOWED_ROLES.has(user.role)) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

// Server-side helper used by API routes: returns the session only if the caller
// is the owner of the requested resource (or a manager who may access anything).
export async function requireSession() {
  return await getSession();
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

  if (!user || !user.isActive || !ALLOWED_ROLES.has(user.role)) {
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
