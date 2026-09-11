import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

// Sends signed-out visitors to the HQ login page. Server actions and data
// loaders check the session themselves as well.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/hq/login")) return NextResponse.next();
  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/hq/login", request.url));
}

export const config = { matcher: "/hq/:path*" };
