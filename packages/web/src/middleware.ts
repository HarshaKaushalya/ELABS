import { NextRequest, NextResponse } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/attendance",
  "/calendar",
  "/labs",
  "/inventory",
  "/messages",
  "/notifications",
  "/ai",
  "/admin",
  "/analytics",
  "/mobile-app",
  "/users",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/courses" || pathname.startsWith("/courses/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/labs";
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const refreshCookie = req.cookies.get("elabs_refresh")?.value;
  if (!refreshCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/attendance/:path*",
    "/calendar/:path*",
    "/labs/:path*",
    "/inventory/:path*",
    "/courses/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/ai/:path*",
    "/admin/:path*",
    "/analytics/:path*",
    "/mobile-app/:path*",
    "/users/:path*",
  ],
};
