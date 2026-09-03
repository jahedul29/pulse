import { isApiError, type ApiErrorCode } from "./errors";

export function apiErrorCode(error: unknown): ApiErrorCode {
  return isApiError(error) ? error.code : "unknown";
}

function pushMessages(value: unknown, out: string[]) {
  if (typeof value === "string") {
    if (value.trim()) out.push(value);
  } else if (Array.isArray(value)) {
    for (const message of value) if (typeof message === "string" && message.trim()) out.push(message);
  }
}

function fieldErrors(details: unknown): string[] {
  if (!details || typeof details !== "object") return [];
  const errors = (details as { errors?: unknown }).errors;
  const out: string[] = [];
  if (Array.isArray(errors)) {
    for (const entry of errors) pushMessages((entry as { messages?: unknown }).messages, out);
  } else if (errors && typeof errors === "object") {
    for (const value of Object.values(errors)) pushMessages(value, out);
  }
  return out;
}

export function apiErrorMessage(error: unknown, t: (key: string) => string): string {
  if (isApiError(error)) {
    const fromBackend = fieldErrors(error.details);
    if (fromBackend.length) return fromBackend.join(" ");
  }
  return t(apiErrorCode(error));
}
