import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/app/lib/auth";

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await (auth as any).api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return redirectToLogin(request);
  }

  const role = String(session.user.role || "").toLowerCase();

  if (pathname.startsWith("/supplier") && role !== "supplier") {
    return redirectToLogin(request);
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/supplier/:path*", "/rfq/:path*", "/admin/:path*"],
};
