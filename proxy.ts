import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeInternalPath } from "@/lib/auth/safe-path";
import { COVERAGE_FILE_PROXY_PATH, coverageObjectUrl } from "@/lib/locations/coverage-origin";

const SESSION_COOKIE = "abapro_session";
const DEFAULT_DEST = "/personnel";

const COVERAGE_RESPONSE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Content-Disposition": "attachment",
};

function coverageFileResponse(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new NextResponse(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const target = coverageObjectUrl(pathname, search);
  if (!target) return new NextResponse(null, { status: 404 });
  // These public S3 objects must not receive the dev site's authentication.
  const headers = new Headers(request.headers);
  headers.delete("authorization");
  headers.delete("cookie");
  return NextResponse.rewrite(new URL(target), {
    request: { headers },
    headers: COVERAGE_RESPONSE_HEADERS,
  });
}

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  if (pathname.startsWith(`${COVERAGE_FILE_PROXY_PATH}/`)) return coverageFileResponse(request);
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
    const destination = new URL(safeInternalPath(searchParams.get("returnTo")) ?? DEFAULT_DEST, url.origin);
    url.pathname = destination.pathname;
    url.search = destination.search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)", "/coverage-files/:path*"],
};
