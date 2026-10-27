import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except /admin/login and /admin/register) and /superadmin
  const isAuthPage =
    pathname === "/admin/login" || pathname === "/admin/register";
  const isAdminRoute = pathname.startsWith("/admin") && !isAuthPage;
  const isSuperAdminRoute = pathname.startsWith("/superadmin");

  if (isAdminRoute || isSuperAdminRoute) {
    const sessionCookie = request.cookies.get("studioin_admin_session");

    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/superadmin/:path*",
  ],
};
