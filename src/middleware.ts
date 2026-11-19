import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth";

const publicExactRoutes = ["/", "/login", "/api/auth/login", "/api/setup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public pages and API endpoints
  if (
    publicExactRoutes.includes(pathname) ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/properties") ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/api/upload")
  ) {
    return NextResponse.next();
  }

  // Check for session
  const session = request.cookies.get("session")?.value;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const payload = await decrypt(session);
    if (!payload) throw new Error("Invalid session");

    return NextResponse.next();
  } catch {
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
