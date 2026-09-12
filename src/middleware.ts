import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role as UserRole | undefined;

    // Resident must never reach /admin/* — checked server-side here,
    // in addition to requireAdmin() inside each admin action/route.
    if (pathname.startsWith("/admin") && !ADMIN_ROLES.includes(role as UserRole)) {
      return NextResponse.redirect(new URL("/resident/dashboard", req.url));
    }

    // Admins land on the admin dashboard, not the resident one.
    if (pathname.startsWith("/resident") && ADMIN_ROLES.includes(role as UserRole)) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Only run the middleware body above once a valid token exists;
      // otherwise NextAuth redirects to the login page automatically.
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/resident/:path*"],
};
