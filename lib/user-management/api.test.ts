import {
  fetchAdminUsers,
  fetchAdminUser,
  fetchUnlinkedStaff,
  adminEmailExists,
  commitStatusChange,
} from "./api";
import { useUserStore } from "./store";

describe("user-management api", () => {
  it("returns rows with an effectiveStatus and flags the locked account", async () => {
    const rows = await fetchAdminUsers();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.find((r) => r.id === "ad-3")?.effectiveStatus).toBe("locked");
  });

  it("filters by status", async () => {
    const rows = await fetchAdminUsers({ statuses: ["pending"] });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.effectiveStatus === "pending")).toBe(true);
  });

  it("filters by role", async () => {
    const rows = await fetchAdminUsers({ roleIds: ["role-superadmin"] });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.roleIds.includes("role-superadmin"))).toBe(true);
  });

  it("searches by name or email", async () => {
    const rows = await fetchAdminUsers({ search: "dana" });
    expect(rows.some((r) => r.name.toLowerCase().includes("dana"))).toBe(true);
  });

  it("fetchAdminUser returns a single row", async () => {
    expect((await fetchAdminUser("ad-1"))?.id).toBe("ad-1");
    expect(await fetchAdminUser("nope")).toBeNull();
  });

  it("adminEmailExists is case-insensitive, excludes by id, and ignores revoked accounts", async () => {
    expect(await adminEmailExists("OWNER@abapro.health")).toBe(true);
    expect(await adminEmailExists("nobody@abapro.health")).toBe(false);
    expect(await adminEmailExists("owner@abapro.health", "ad-2")).toBe(false);
    expect(await adminEmailExists("aisha.bello@abapro.health")).toBe(false); // ad-10 revoked -> freed
  });

  it("commitStatusChange rejects failing accounts and self-actions, resolves others", async () => {
    await expect(commitStatusChange("ad-11")).rejects.toThrow();
    await expect(commitStatusChange("ad-2", "owner@abapro.health")).rejects.toThrow(); // self
    await expect(commitStatusChange("ad-1")).resolves.toBeUndefined();
    await expect(commitStatusChange("ad-1", "owner@abapro.health")).resolves.toBeUndefined();
  });

  it("unlinked staff excludes linked/terminated/deactivated-linked; revoked frees the staff", async () => {
    const before = await fetchUnlinkedStaff();
    expect(before.some((s) => s.id === "st-5")).toBe(false); // terminated
    expect(before.some((s) => s.id === "st-1")).toBe(false); // linked to active ad-1
    expect(before.some((s) => s.id === "st-9")).toBe(false); // linked to deactivated ad-9
    expect(before.some((s) => s.id === "st-10")).toBe(true); // linked to revoked ad-10 -> free

    const id = useUserStore.getState().invite({
      staffId: "st-40",
      name: "Owen Clark",
      email: "owen.freed@abapro.health",
      initials: "OC",
      roleIds: ["role-cco"],
      by: "T",
    });
    expect((await fetchUnlinkedStaff()).some((s) => s.id === "st-40")).toBe(false);

    useUserStore.getState().revoke(id, "T");
    expect((await fetchUnlinkedStaff()).some((s) => s.id === "st-40")).toBe(true);
  });
});
