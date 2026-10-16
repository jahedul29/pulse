import { isApiError } from "@/lib/api/errors";

export type ServerErrorKind =
  | "credentials"
  | "network"
  | "timeout"
  | "unavailable"
  | "server"
  | "rate_limited"
  | "unknown";

export interface ServerErrorInfo {
  kind: ServerErrorKind;
  message?: string;
}

export function describeServerError(error: unknown): ServerErrorInfo {
  if (!isApiError(error)) return { kind: "unknown" };
  const kind: ServerErrorKind =
    error.code === "network"
      ? "network"
      : error.code === "timeout"
        ? "timeout"
        : error.status === 503
          ? "unavailable"
          : error.status === 429
            ? "rate_limited"
            : error.status >= 500
              ? "server"
              : "unknown";
  const body = error.details as { message?: unknown } | null | undefined;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  return message ? { kind, message } : { kind };
}
