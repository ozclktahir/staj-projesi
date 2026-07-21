import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/register", "/clear-session"];
const AUTH_COOKIE = "auth_session";
const ACCESS_TOKEN_COOKIE = "sb_access_token";

function readCookie(request: NextRequest, name: string): string | null {
  try {
    const value = request.cookies.get(name)?.value;
    if (!value || value.trim() === "") {
      return null;
    }
    return value.trim();
  } catch {
    return null;
  }
}

function clearAuthCookies(response: NextResponse) {
  const expired = { path: "/", maxAge: 0 };
  for (const name of [
    AUTH_COOKIE,
    ACCESS_TOKEN_COOKIE,
    "sb_refresh_token",
    "access_token",
    "refresh_token",
  ]) {
    try {
      response.cookies.set(name, "", expired);
    } catch {
      // ignore
    }
  }
}

function hasSession(request: NextRequest): boolean {
  const flag = readCookie(request, AUTH_COOKIE);
  const token =
    readCookie(request, ACCESS_TOKEN_COOKIE) ||
    readCookie(request, "access_token");
  return Boolean(flag && token);
}

export function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const isPublicRoute = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
    const isOnboardingRoute =
      pathname === "/onboarding" || pathname.startsWith("/onboarding/");
    const isUnauthorizedRoute =
      pathname === "/unauthorized" || pathname.startsWith("/unauthorized/");
    const session = hasSession(request);

    if (!session && !isPublicRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (readCookie(request, AUTH_COOKIE)) {
        clearAuthCookies(res);
      }
      return res;
    }

    // Oturumlu kullanıcı public auth sayfalarına gidemez
    if (session && isPublicRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // onboarding / unauthorized oturum gerektirir
    if (!session && (isOnboardingRoute || isUnauthorizedRoute)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("[proxy] unexpected:", error);
    try {
      const res = NextResponse.redirect(new URL("/login", request.url));
      clearAuthCookies(res);
      return res;
    } catch {
      return NextResponse.next();
    }
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
