import { create } from "zustand";
import { SEED_OTHER_SESSIONS } from "./mock";
import { deviceLabelFromUA } from "@/lib/device";
import type { DeviceSession } from "./types";

function seedOthers(): DeviceSession[] {
  const now = Date.now();
  return SEED_OTHER_SESSIONS.map((s) => ({
    id: s.id,
    deviceName: s.deviceName ?? deviceLabelFromUA(s.userAgent),
    userAgent: s.userAgent,
    issuedAt: now - s.issuedOffsetMs,
    expiresAt: now - s.issuedOffsetMs + s.ttlMs,
    current: false,
  }));
}

interface SessionState {
  others: DeviceSession[];
  revoke: (id: string) => void;
  revokeAllOthers: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  others: seedOthers(),
  revoke: (id) => set((s) => ({ others: s.others.filter((d) => d.id !== id) })),
  revokeAllOthers: () => set({ others: [] }),
}));
