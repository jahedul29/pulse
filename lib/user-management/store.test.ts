import { useUserStore } from "./store";
import type { InviteInput } from "./types";

const get = () => useUserStore.getState();
const find = (id: string) => get().users.find((u) => u.id === id);

let seq = 0;
function invite(): string {
  const input: InviteInput = {
    staffId: "st-31",
    name: "Test User",
    email: `invite-${seq++}@abapro.health`,
    initials: "TU",
    roleIds: ["role-admin"],
    by: "Tester",
  };
  return get().invite(input);
}

describe("useUserStore", () => {
  it("invite creates a pending account with no last login", () => {
    const id = invite();
    const u = find(id)!;
    expect(u.status).toBe("pending");
    expect(u.lastLogin).toBeNull();
    expect(u.lastInviteSentAt).not.toBeNull();
    expect(u.roleIds).toEqual(["role-admin"]);
  });

  it("suspend / reactivate / deactivate transition status and stamp the actor", () => {
    const id = invite();
    get().suspend(id, "Boss");
    expect(find(id)!.status).toBe("suspended");
    expect(find(id)!.lastStatusChangeBy).toBe("Boss");
    get().reactivate(id, "Boss");
    expect(find(id)!.status).toBe("active");
    get().deactivate(id, "Boss");
    expect(find(id)!.status).toBe("deactivated");
  });

  it("revoke marks the invitation revoked", () => {
    const id = invite();
    get().revoke(id, "Boss");
    expect(find(id)!.status).toBe("revoked");
  });

  it("resend refreshes lastInviteSentAt", () => {
    const id = invite();
    const before = find(id)!.lastInviteSentAt!;
    get().resend(id);
    expect(find(id)!.lastInviteSentAt!).toBeGreaterThanOrEqual(before);
  });

  it("unlock clears lockedUntil", () => {
    get().unlock("ad-3");
    expect(find("ad-3")!.lockedUntil).toBeNull();
  });

  it("replaceUser restores a snapshot (rollback)", () => {
    const id = invite();
    const snapshot = { ...find(id)! };
    get().suspend(id, "Boss");
    expect(find(id)!.status).toBe("suspended");
    get().replaceUser(id, snapshot);
    expect(find(id)!.status).toBe("pending");
  });
});
