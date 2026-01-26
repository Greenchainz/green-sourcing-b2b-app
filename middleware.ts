import { auth } from "@/app/app.auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/suppliers') ||
    req.nextUrl.pathname.startsWith('/architects') ||
    req.nextUrl.pathname.startsWith('/api/communications') ||
    req.nextUrl.pathname.startsWith('/api/support') ||
    req.nextUrl.pathname.startsWith('/api/rfq');

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/suppliers/:path*",
    "/architects/:path*",
    "/api/communications/:path*",
    "/api/support/:path*",
    "/api/rfq/:path*",
  ],
};
