export const IDLE_TIMEOUT_MINUTES = 10;
export const IDLE_WARNING_SECONDS = 60;
export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60_000;
export const IDLE_WARNING_MS = IDLE_WARNING_SECONDS * 1000;
export const IDLE_CHECK_MS = 1000;
export const ACTIVITY_WRITE_MS = 5000;
export const POINTER_ACTIVITY_MS = 30_000;
export const LAST_ACTIVITY_KEY = "abapro-last-activity";
export const IDLE_SIGN_OUT_KEY = "abapro-idle-sign-out";
export const IDLE_REASON = "idle";

export type IdlePhase = "active" | "warning" | "expired";

export function idlePhase(lastActivity: number, now: number): IdlePhase {
  const idle = now - lastActivity;
  if (idle >= IDLE_TIMEOUT_MS) return "expired";
  if (idle >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS) return "warning";
  return "active";
}

export function secondsUntilSignOut(lastActivity: number, now: number): number {
  return Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - (now - lastActivity)) / 1000));
}

export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function readLastActivity(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const value = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeLastActivity(time: number) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(time));
  } catch {
    void 0;
  }
}

export function announceIdleSignOut(time: number) {
  try {
    localStorage.setItem(IDLE_SIGN_OUT_KEY, String(time));
  } catch {
    void 0;
  }
}

export function idleLoginHref(returnTo: string): string {
  return `/login?reason=${IDLE_REASON}&returnTo=${encodeURIComponent(returnTo)}`;
}
