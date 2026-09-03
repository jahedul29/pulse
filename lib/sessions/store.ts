import { create } from "zustand";
import { SEED_OTHER_SESSIONS } from "./mock";
import { deviceLabelFromUA } from "@/lib/device";
import type { DeviceSession } from "./types";

function seedOthers(): DeviceSession[] {
  const now = Date.now();
  return SEED_OTHER_SESSIONS.map((seed) => ({
    id: seed.id,
    deviceName: seed.deviceName ?? deviceLabelFromUA(seed.userAgent),
    userAgent: seed.userAgent,
    issuedAt: now - seed.issuedOffsetMs,
    expiresAt: now - seed.issuedOffsetMs + seed.ttlMs,
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
  revoke: (id) => set((state) => ({ others: state.others.filter((device) => device.id !== id) })),
  revokeAllOthers: () => set({ others: [] }),
}));
