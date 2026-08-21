import { useAuthStore } from "@/lib/auth/store";
import { useSessionStore } from "./store";
import { currentDeviceLabel } from "@/lib/device";
import type { DeviceSession } from "./types";

const SESSION_TTL_MS = 7 * 86_400_000;

function currentSession(): DeviceSession | null {
  const session = useAuthStore.getState().session;
  if (!session) return null;
  return {
    id: session.token,
    deviceName: currentDeviceLabel("This device"),
    userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    issuedAt: session.issuedAt,
    expiresAt: session.issuedAt + SESSION_TTL_MS,
    current: true,
  };
}

export async function fetchSessions(): Promise<DeviceSession[]> {
  const current = currentSession();
  const others = useSessionStore.getState().others;
  return [...(current ? [current] : []), ...others].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    return b.issuedAt - a.issuedAt;
  });
}
