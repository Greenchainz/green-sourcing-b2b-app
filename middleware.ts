import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// DO NOT import auth or anything that imports lib/secrets.ts here
// Edge runtime cannot use @azure/identity

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
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", request.headers.get("origin") || "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    response.headers.set("Access-Control-Allow-Credentials", "true");
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
