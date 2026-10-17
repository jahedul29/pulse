import { isForbidden } from "@/lib/api/errors";

const MIN_REFRESH_GAP_MS = 10_000;

let refresher: (() => void) | null = null;
let lastRefreshAt = 0;

export function registerProfileRefresh(refresh: (() => void) | null) {
  refresher = refresh;
}

export function refreshProfileAfterForbidden(error: unknown) {
  if (!refresher || !isForbidden(error)) return;
  const now = Date.now();
  if (now - lastRefreshAt < MIN_REFRESH_GAP_MS) return;
  lastRefreshAt = now;
  refresher();
}

export function resetProfileRefresh() {
  lastRefreshAt = 0;
}
