import type { AdminUser, AdminUserStatus, RoleRef } from "@/lib/user-management/types";
import { activeSuperadminIds, holdsSuperadmin, isLastActiveSuperadmin, isSuperadminRole } from "./superadmin";

const NOW = Date.parse("2026-10-22T12:00:00Z");

function user(id: string, status: AdminUserStatus, roles: RoleRef[]): AdminUser {
  return { id, status, roles } as AdminUser;
}

const superadmin = (expiresAt: number | null = null): RoleRef => ({ id: "4", name: "superadmin", expiresAt });

describe("isSuperadminRole", () => {
  it("matches the built-in role name whatever its case or spacing", () => {
    expect(isSuperadminRole("superadmin")).toBe(true);
    expect(isSuperadminRole(" SuperAdmin ")).toBe(true);
    expect(isSuperadminRole("supervisor")).toBe(false);
    expect(isSuperadminRole(null)).toBe(false);
  });
});

describe("holdsSuperadmin", () => {
  it("ignores a grant that has already expired", () => {
    expect(holdsSuperadmin(user("a", "active", [superadmin()]), NOW)).toBe(true);
    expect(holdsSuperadmin(user("a", "active", [superadmin(NOW + 1000)]), NOW)).toBe(true);
    expect(holdsSuperadmin(user("a", "active", [superadmin(NOW - 1000)]), NOW)).toBe(false);
    expect(holdsSuperadmin(user("a", "active", [{ id: "3", name: "admin" }]), NOW)).toBe(false);
  });
});

describe("last active Super Admin", () => {
  const users = [
    user("one", "active", [superadmin()]),
    user("two", "suspended", [superadmin()]),
    user("three", "active", [{ id: "3", name: "admin" }]),
  ];

  it("counts only active accounts that hold the role", () => {
    expect(activeSuperadminIds(users, NOW)).toEqual(["one"]);
  });

  it("flags the only active holder and nobody else", () => {
    expect(isLastActiveSuperadmin("one", users, NOW)).toBe(true);
    expect(isLastActiveSuperadmin("two", users, NOW)).toBe(false);
    expect(isLastActiveSuperadmin("three", users, NOW)).toBe(false);
  });

  it("lets either of two active holders go", () => {
    const two = [...users, user("four", "active", [superadmin()])];
    expect(isLastActiveSuperadmin("one", two, NOW)).toBe(false);
    expect(isLastActiveSuperadmin("four", two, NOW)).toBe(false);
  });
});
