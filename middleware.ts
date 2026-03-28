import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// DO NOT import auth or anything that imports lib/secrets.ts here
// Edge runtime cannot use @azure/identity

// ── CORS allowlist ────────────────────────────────────────────────────────────
// Set CORS_ALLOWED_ORIGINS to a comma-separated list of production origins.
// Falls back to reflecting the request origin in development (empty env var).
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function resolveCorsOrigin(requestOrigin: string | null): string {
  if (!requestOrigin) return "";
  // Always allow if no allowlist is configured (local dev)
  if (allowedOrigins.length === 0) return requestOrigin;
  return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
}

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = [
    "/", "/login", "/signup", "/about", "/blog", "/careers",
    "/contact", "/how-it-works", "/pricing", "/help-center",
    "/api-docs", "/partner-program", "/privacy", "/terms", "/supplier-agreement",
  ];

  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));

  // Lightweight cookie check — no Azure SDK, no Key Vault
  // app_session_id is the JWT cookie set by oauth-providers.ts and easy-auth dev shim
  const sessionToken =
    request.cookies.get("app_session_id")?.value ||
    request.cookies.get("__Secure-app_session_id")?.value;

  const hasSession = !!sessionToken;

  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.startsWith("/.auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    const corsOrigin = resolveCorsOrigin(request.headers.get("origin"));
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Allow-Credentials": "true",
    };
    if (corsOrigin) corsHeaders["Access-Control-Allow-Origin"] = corsOrigin;

    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: { ...corsHeaders, "Access-Control-Max-Age": "86400" },
      });
    }
    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|\\.auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
