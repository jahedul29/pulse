/** @jest-environment node */

import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("coverage file proxy", () => {
  it.each(["GET", "HEAD"])("forwards %s coverage requests without browser credentials", (method) => {
    const request = new NextRequest(
      "https://dev-admin.abapro.ai/coverage-files/abapro-staging/Media/coverage/cities/ADB/tiles.v14.json",
      {
        method,
        headers: {
          authorization: "Basic dGVzdDp0ZXN0",
          cookie: "abapro_session=test-session",
          accept: "application/json",
        },
      },
    );

    const response = proxy(request);

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://abapro.s3.eu-north-1.amazonaws.com/abapro-staging/Media/coverage/cities/ADB/tiles.v14.json",
    );
    const forwardedHeaders = response.headers.get("x-middleware-override-headers")?.split(",");
    expect(forwardedHeaders).toContain("accept");
    expect(forwardedHeaders).not.toContain("authorization");
    expect(forwardedHeaders).not.toContain("cookie");
    expect(response.headers.get("x-middleware-request-accept")).toBe("application/json");
    expect(response.headers.get("x-middleware-request-authorization")).toBeNull();
    expect(response.headers.get("x-middleware-request-cookie")).toBeNull();
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
