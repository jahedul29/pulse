import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "abapro_session";
const DEFAULT_DEST = "/personnel";

function isSafePath(path: string | null): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\"));
}

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const authed = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const onLogin = pathname === "/login";

  if (!authed && !onLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("returnTo", pathname + search);
    return NextResponse.redirect(url);
  }

  if (authed && onLogin) {
    const url = request.nextUrl.clone();
    const returnTo = searchParams.get("returnTo");
    url.pathname = isSafePath(returnTo) ? returnTo : DEFAULT_DEST;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
