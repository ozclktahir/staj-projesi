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

/** JWT imza doğrulamadan sadece exp kontrolü (proxy için). */
function isJwtExpired(token: string | null | undefined): boolean {
  if (!token || token.trim() === "") return true;
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 <= Date.now() - 30_000;
  } catch {
    return true;
  }
}

function hasValidSession(request: NextRequest): boolean {
  const flag = readCookie(request, AUTH_COOKIE);
  const token =
    readCookie(request, ACCESS_TOKEN_COOKIE) ||
    readCookie(request, "access_token");
  if (!flag || !token) return false;
  if (isJwtExpired(token)) return false;
  return true;
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

    const token =
      readCookie(request, ACCESS_TOKEN_COOKIE) ||
      readCookie(request, "access_token");
    const hasStaleCookies =
      Boolean(readCookie(request, AUTH_COOKIE) || token) &&
      (!token || isJwtExpired(token));

    // Süresi dolmuş cookie'leri temizle — yoksa / ↔ /login redirect loop olur
    if (hasStaleCookies && !isPublicRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      clearAuthCookies(res);
      return res;
    }

    if (hasStaleCookies && isPublicRoute) {
      const res = NextResponse.next();
      clearAuthCookies(res);
      return res;
    }

    const session = hasValidSession(request);

    if (!session && !isPublicRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (readCookie(request, AUTH_COOKIE) || token) {
        clearAuthCookies(res);
      }
      return res;
    }

    // Oturumlu kullanıcı public auth sayfalarına gidemez (clear-session hariç)
    if (
      session &&
      isPublicRoute &&
      pathname !== "/clear-session" &&
      !pathname.startsWith("/clear-session/")
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // onboarding / unauthorized oturum gerektirir
    if (!session && (isOnboardingRoute || isUnauthorizedRoute)) {
      const res = NextResponse.redirect(new URL("/login", request.url));
      clearAuthCookies(res);
      return res;
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
