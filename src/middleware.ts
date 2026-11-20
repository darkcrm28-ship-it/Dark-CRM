
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session-token";

const publicExactRoutes = [
  "/",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/setup",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public pages and the explicitly public catalog/inquiry endpoints only.
  // Do not use startsWith("/properties") because it also exempts similarly
  // prefixed internal paths.
  if (
    publicExactRoutes.includes(pathname) ||
    pathname.startsWith("/share/") ||
    pathname === "/properties" ||
    pathname.startsWith("/properties/") ||
    pathname.startsWith("/api/public/")
  ) {
    return NextResponse.next();
  }

  // Check for session
  const session = request.cookies.get("session")?.value;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const payload = await decrypt(session);

    if (!payload) {
      throw new Error("Invalid session");
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
