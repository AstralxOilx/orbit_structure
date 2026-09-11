import { NextResponse, type NextRequest } from "next/server";

// Next 16 calls this file convention Proxy (formerly Middleware).
// It performs the fast client-side route gate; the backend remains the
// authority and validates the HttpOnly session on every protected API call.
export function proxy(request: NextRequest) {
  // The auth screen is the only public application page.
  if (
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname === "/error"
  ) {
    return NextResponse.next();
  }
  if (!request.cookies.has("orbit_session")) {
    const url = new URL("/", request.url);
    url.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protect every application route except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
