import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = [
  "/dashboard",
  "/memories",
  "/journal",
  "/calendar",
  "/notes",
  "/settings",
];

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const isLoggedIn = Boolean(token);
  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`),
  );

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/memories/:path*",
    "/journal/:path*",
    "/calendar/:path*",
    "/notes/:path*",
    "/settings/:path*",
  ],
};
