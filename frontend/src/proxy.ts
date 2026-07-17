import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/register"];
const AUTH_COOKIE = "auth_session";

function readAuthSession(request: NextRequest): string | null {
  try {
    const value = request.cookies.get(AUTH_COOKIE)?.value;
    if (!value || value.trim() === "") {
      return null;
    }
    return value.trim();
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const session = readAuthSession(request);
    const isPublicRoute = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

    if (!session && !isPublicRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session && isPublicRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch {
    // Cookie parse / edge hatalarında uygulamayı düşürme; login'e yönlendir
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
