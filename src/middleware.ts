import { publicLocalePath } from "./lib/public-locale-path";

import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session-token";

const publicExactRoutes = [
  "/",
  "/login",
  "/offline",
  "/client-portal",
  "/guides/finishes",
  "/guides/decor",
  "/guides/news",
  "/manifest.json",
  "/property-portal.webmanifest",
  "/sw.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/setup",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const localized = publicLocalePath(pathname);
  if (localized) {
    const url = request.nextUrl.clone();
    url.pathname = localized.path;
    request.cookies.set("darak-language",localized.locale);
    const response = NextResponse.rewrite(url,{request:{headers:new Headers(request.headers)}});
    response.cookies.set("darak-language",localized.locale,{path:"/",maxAge:31536000,sameSite:"lax"});
    return response;
  }

  // Public pages and the explicitly public catalog/inquiry endpoints only.
  // NOTE: /share/* is intentionally NOT exempt. Until an approved publish /
  // share mechanism exists, share pages must be served only to authenticated
  // sessions. A bare UUID is not an authorization mechanism.
  if (
    publicExactRoutes.includes(pathname) ||
    pathname === "/properties" ||
    pathname.startsWith("/properties/") ||
    pathname === "/portfolio" ||
    pathname === "/contact" ||
    pathname === "/sell" ||
    pathname.startsWith("/portfolio/") ||
    pathname.startsWith("/contact/") ||
    pathname.startsWith("/sell/") ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/images/")
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

    if (typeof payload.id !== "string" || !payload.id || payload.aud === "darak-property-portal") {
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
