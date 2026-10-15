import { ApiError } from "@/lib/api/errors";
import { describeServerError } from "./server-error";

describe("describeServerError", () => {
  it("classifies network and timeout failures without a message", () => {
    expect(describeServerError(new ApiError("network", 0, "Network request failed"))).toEqual({ kind: "network" });
    expect(describeServerError(new ApiError("timeout", 0, "Request timed out"))).toEqual({ kind: "timeout" });
  });

  it("keeps the backend message for a downstream outage (503)", () => {
    const error = new ApiError("server", 503, "Service Unavailable", {
      success: false,
      message: "User management service is unavailable. Please try again later.",
    });
    expect(describeServerError(error)).toEqual({
      kind: "unavailable",
      message: "User management service is unavailable. Please try again later.",
    });
  });

  it("classifies 5xx, 429 and other statuses, never exposing debug details", () => {
    const crash = new ApiError("server", 500, "Server Error", {
      message: "Something went wrong. Please try again later.",
      debug: { exception: "RelationNotFoundException" },
    });
    expect(describeServerError(crash)).toEqual({ kind: "server", message: "Something went wrong. Please try again later." });
    expect(describeServerError(new ApiError("rate_limited", 429, "Too Many Requests", {}))).toEqual({ kind: "rate_limited" });
    expect(describeServerError(new ApiError("forbidden", 403, "Forbidden", { message: "  " }))).toEqual({ kind: "unknown" });
  });

  it("treats non-API errors as unknown", () => {
    expect(describeServerError(new TypeError("boom"))).toEqual({ kind: "unknown" });
  });
});
