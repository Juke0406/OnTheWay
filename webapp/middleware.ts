import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Get the session cookie directly
  const sessionCookie = getSessionCookie(request);

  // Simple check - if accessing dashboard and no session cookie, redirect to login
  if (request.nextUrl.pathname.startsWith("/dashboard") && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Continue with the request
  return NextResponse.next();
}

// Configure which paths this middleware will run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
