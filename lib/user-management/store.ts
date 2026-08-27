import { create } from "zustand";
import { useAuthStore } from "@/lib/auth/store";
import { seedAdminUsers } from "./mock";
import type { AdminUser, InviteInput } from "./types";

let seq = 0;
function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `ad-${crypto.randomUUID()}`;
  return `ad-${Date.now()}-${seq++}`;
}

interface UserState {
  users: AdminUser[];
  invite: (input: InviteInput) => string;
  resend: (id: string) => void;
  revoke: (id: string, by: string) => void;
  suspend: (id: string, by: string) => void;
  reactivate: (id: string, by: string) => void;
  deactivate: (id: string, by: string) => void;
  unlock: (id: string) => void;
  replaceUser: (id: string, snapshot: AdminUser) => void;
}

function patch(id: string, fn: (u: AdminUser) => AdminUser) {
  return (s: UserState) => ({ users: s.users.map((u) => (u.id === id ? fn(u) : u)) });
}

export const useUserStore = create<UserState>((set, get) => ({
  users: seedAdminUsers(),

  invite: (input) => {
    const id = uid();
    const now = Date.now();
    const user: AdminUser = {
      id,
      staffId: input.staffId,
      name: input.name,
      email: input.email,
      initials: input.initials,
      status: "pending",
      mfaEnabled: false,
      lockedUntil: null,
      lastLogin: null,
      roleIds: input.roleIds,
      invitedBy: input.by,
      invitedAt: now,
      activatedAt: null,
      lastStatusChangeAt: null,
      lastStatusChangeBy: null,
      registeredDevices: 0,
      lastInviteSentAt: now,
    };
    set((s) => ({ users: [user, ...s.users] }));
    return id;
  },

  resend: (id) => set(patch(id, (u) => ({ ...u, lastInviteSentAt: Date.now() }))),

  revoke: (id, by) =>
    set(
      patch(id, (u) => ({
        ...u,
        status: "revoked",
        lastStatusChangeAt: Date.now(),
        lastStatusChangeBy: by,
      })),
    ),

  suspend: (id, by) =>
    set(
      patch(id, (u) => ({
        ...u,
        status: "suspended",
        lastStatusChangeAt: Date.now(),
        lastStatusChangeBy: by,
      })),
    ),

  reactivate: (id, by) =>
    set(
      patch(id, (u) => ({
        ...u,
        status: "active",
        lastStatusChangeAt: Date.now(),
        lastStatusChangeBy: by,
      })),
    ),

  deactivate: (id, by) =>
    set(
      patch(id, (u) => ({
        ...u,
        status: "deactivated",
        lastStatusChangeAt: Date.now(),
        lastStatusChangeBy: by,
      })),
    ),

  unlock: (id) => {
    const target = get().users.find((u) => u.id === id);
    if (!target) return;
    useAuthStore.getState().recordUnlock(target.email);
    set(patch(id, (u) => ({ ...u, lockedUntil: null })));
  },

  replaceUser: (id, snapshot) => set(patch(id, () => snapshot)),
}));
