import { create } from "zustand";
import { useAuthStore } from "./store";

const MINUTE = 60_000;

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  lockedUntil: number | null;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function make(id: string, name: string, email: string, role: string, lockOffsetMs?: number): AdminAccount {
  return {
    id,
    name,
    email,
    role,
    initials: initialsOf(name),
    lockedUntil: lockOffsetMs ? Date.now() + lockOffsetMs : null,
  };
}

function seed(): AdminAccount[] {
  return [
    make("ad-1", "Dana Okonkwo", "dana.okonkwo@abapro.health", "Administrator"),
    make("ad-2", "Sam Al-Rashid", "sam.alrashid@abapro.health", "Owner"),
    make("ad-3", "Mara Devlin", "mara.devlin@abapro.health", "Administrator", 10 * MINUTE),
    make("ad-4", "Theo Nakamura", "theo.nakamura@abapro.health", "Analyst"),
  ];
}

interface AdminState {
  admins: AdminAccount[];
  unlock: (id: string) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  admins: seed(),
  unlock: (id) => {
    const target = get().admins.find((a) => a.id === id);
    if (!target) return;
    useAuthStore.getState().recordUnlock(target.email);
    set((s) => ({
      admins: s.admins.map((a) => (a.id === id ? { ...a, lockedUntil: null } : a)),
    }));
  },
}));
