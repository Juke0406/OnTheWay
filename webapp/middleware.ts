import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(request: NextRequest) {
  // Get the session cookie directly
  const sessionCookie = getSessionCookie(request);

  // Simple check - if accessing protected routes and no session cookie, redirect to login
  if (
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/map")) &&
    !sessionCookie
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
