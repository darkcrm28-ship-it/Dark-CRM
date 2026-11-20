import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/session-token";

export { decrypt, encrypt } from "@/lib/session-token";

// Read the current account state and role from the database on every server-side
// session check. This makes deactivation and role changes effective immediately.
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const payload = await decrypt(token);
    if (typeof payload.id !== "string" || !payload.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  } catch (error) {
    console.error("Session Validation Error:", error);
    return null;
  }
}

// Legacy helper retained for compatibility with any existing caller.
export async function updateSession(request: any) {
  const token = request.cookies.get("session")?.value;
  if (!token) return;

  try {
    const payload = await decrypt(token);
    const response = NextResponse.next();
    response.cookies.set({
      name: "session",
      value: await encrypt(payload),
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch (error) {
    console.error("Session Update Error:", error);
    return;
  }
}
