import { API_BASE_URL } from "./config";
import { ApiError, codeForStatus } from "./errors";
import { getAuthBridge } from "./auth-bridge";

const DEFAULT_TIMEOUT_MS = 15_000;

export type QueryValue = string | number | boolean | null | undefined;

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue | QueryValue[]>;
  signal?: AbortSignal;
  auth?: boolean;
  timeoutMs?: number;
  headers?: Record<string, string>;
  retry?: boolean;
}

function buildUrl(path: string, query?: ApiFetchOptions["query"]): string {
  const base = path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value === undefined || value === null || value === "") continue;
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "title"]) {
      const value = rec[key];
      if (typeof value === "string" && value) return value;
    }
  }
  return fallback;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    signal,
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers = {},
    retry = false,
  } = options;

  const bridge = getAuthBridge();
  const url = buildUrl(path, query);

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  if (body !== undefined && !isForm) finalHeaders["Content-Type"] = "application/json";
  if (auth) {
    const token = bridge?.getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (didTimeout) throw new ApiError("timeout", 0, "Request timed out");
    if (signal?.aborted) throw error;
    throw new ApiError("network", 0, "Network request failed", error);
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }

  if (res.status === 401 && auth && !retry) {
    const refreshed = await bridge?.refresh();
    if (refreshed) return apiFetch<T>(path, { ...options, retry: true });
    bridge?.onAuthLost();
    throw new ApiError("unauthorized", 401, "Session expired");
  }

  const parsed = await parseBody(res);

  if (!res.ok) {
    const code = codeForStatus(res.status);
    throw new ApiError(code, res.status, messageFromBody(parsed, res.statusText || "Request failed"), parsed);
  }

  return parsed as T;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  status: number;
  meta?: PaginationMeta;
  links?: Record<string, unknown>;
}

export interface Paginated<T> {
  data: T[];
  meta?: PaginationMeta;
}

export async function apiData<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const env = await apiFetch<ApiEnvelope<T>>(path, options);
  return env.data;
}

export async function apiList<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<{ data: T[]; meta?: PaginationMeta; links?: Record<string, unknown> }> {
  const env = await apiFetch<ApiEnvelope<T[]>>(path, options);
  return { data: env.data ?? [], meta: env.meta, links: env.links };
}
