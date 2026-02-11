import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/about",
    "/blog",
    "/careers",
    "/contact",
    "/how-it-works",
    "/pricing",
    "/help-center",
    "/api-docs",
    "/partner-program",
    "/privacy",
    "/terms",
    "/supplier-agreement",
  ];

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Allow API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.startsWith("/.auth")) {
    return NextResponse.next();
  }

  // If user is not authenticated and trying to access protected route
  if (!session?.user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated
  if (session?.user) {
    const user = session.user as any;
    const userRole = user.role || "buyer"; // Default to buyer if no role

    // Redirect from root dashboard to role-specific dashboard
    if (pathname === "/dashboard") {
      if (userRole === "admin") {
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      } else if (userRole === "supplier") {
        return NextResponse.redirect(new URL("/dashboard/supplier", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard/buyer", request.url));
      }
    }

    // Prevent buyers from accessing supplier dashboard
    if (pathname.startsWith("/dashboard/supplier") && userRole !== "supplier" && userRole !== "admin") {
      return NextResponse.redirect(new URL("/dashboard/buyer", request.url));
    }

    // Prevent suppliers from accessing buyer dashboard
    if (pathname.startsWith("/dashboard/buyer") && userRole !== "buyer" && userRole !== "admin") {
      return NextResponse.redirect(new URL("/dashboard/supplier", request.url));
    }

    // Prevent non-admins from accessing admin dashboard
    if (pathname.startsWith("/dashboard/admin") && userRole !== "admin") {
      if (userRole === "supplier") {
        return NextResponse.redirect(new URL("/dashboard/supplier", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard/buyer", request.url));
      }
    }

    // Redirect authenticated users away from login/signup pages
    if (pathname === "/login" || pathname === "/signup") {
      if (userRole === "admin") {
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      } else if (userRole === "supplier") {
        return NextResponse.redirect(new URL("/dashboard/supplier", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard/buyer", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - .auth (Azure Easy Auth paths)
     */
    "/((?!_next/static|_next/image|favicon.ico|\\.auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
