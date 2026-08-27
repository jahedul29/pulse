import type { AdminUser, AdminUserStatus } from "./types";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;

const OWNER = "Sam Al-Rashid";
const DANA = "Dana Okonkwo";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type Seed = {
  id: string;
  staffId: string;
  name: string;
  email: string;
  status: AdminUserStatus;
  roleIds: string[];
  mfa: boolean;
  devices: number;
  invitedDaysAgo: number;
  lastLoginHoursAgo: number | null;
  invitedBy?: string;
  statusChangedDaysAgo?: number | null;
  statusChangedBy?: string | null;
  lockedMins?: number;
  inviteSentMinsAgo?: number | null;
  willFail?: boolean;
};

function build(s: Seed): AdminUser {
  const now = Date.now();
  const invitedAt = now - s.invitedDaysAgo * DAY;
  const pendingLike = s.status === "pending" || s.status === "revoked";
  return {
    id: s.id,
    staffId: s.staffId,
    name: s.name,
    email: s.email,
    initials: initialsOf(s.name),
    status: s.status,
    mfaEnabled: s.mfa,
    lockedUntil: s.lockedMins ? now + s.lockedMins * MINUTE : null,
    lastLogin: s.lastLoginHoursAgo == null ? null : now - s.lastLoginHoursAgo * HOUR,
    roleIds: s.roleIds,
    invitedBy: s.invitedBy ?? OWNER,
    invitedAt,
    activatedAt: pendingLike ? null : invitedAt + 2 * HOUR,
    lastStatusChangeAt: s.statusChangedDaysAgo != null ? now - s.statusChangedDaysAgo * DAY : null,
    lastStatusChangeBy: s.statusChangedBy ?? null,
    registeredDevices: s.devices,
    lastInviteSentAt:
      s.status === "pending"
        ? s.inviteSentMinsAgo != null
          ? now - s.inviteSentMinsAgo * MINUTE
          : invitedAt
        : null,
    willFailMutation: s.willFail,
  };
}

const SEEDS: Seed[] = [
  { id: "ad-1", staffId: "st-1", name: DANA, email: "dana.okonkwo@abapro.health", status: "active", roleIds: ["role-admin"], mfa: true, devices: 2, invitedDaysAgo: 180, lastLoginHoursAgo: 2 },
  { id: "ad-2", staffId: "st-2", name: OWNER, email: "owner@abapro.health", status: "active", roleIds: ["role-superadmin"], mfa: false, devices: 3, invitedDaysAgo: 400, lastLoginHoursAgo: 26 },
  { id: "ad-3", staffId: "st-3", name: "Mara Devlin", email: "mara.devlin@abapro.health", status: "active", roleIds: ["role-supervisor"], mfa: false, devices: 1, invitedDaysAgo: 90, lastLoginHoursAgo: 120, lockedMins: 8 },
  { id: "ad-4", staffId: "st-4", name: "Theo Nakamura", email: "theo.nakamura@abapro.health", status: "active", roleIds: ["role-cco", "role-refund"], mfa: true, devices: 2, invitedDaysAgo: 60, lastLoginHoursAgo: 9 },
  { id: "ad-5", staffId: "st-5", name: "Priya Nair", email: "priya.nair@abapro.health", status: "active", roleIds: ["role-cco"], mfa: false, devices: 1, invitedDaysAgo: 150, lastLoginHoursAgo: 48 },
  { id: "ad-6", staffId: "st-6", name: "Omar Haddad", email: "omar.haddad@abapro.health", status: "pending", roleIds: ["role-admin"], mfa: false, devices: 0, invitedDaysAgo: 1, lastLoginHoursAgo: null, inviteSentMinsAgo: 90 },
  { id: "ad-7", staffId: "st-7", name: "Lena Fischer", email: "lena.fischer@abapro.health", status: "pending", roleIds: ["role-supervisor"], mfa: false, devices: 0, invitedDaysAgo: 0, lastLoginHoursAgo: null, inviteSentMinsAgo: 0, invitedBy: DANA },
  { id: "ad-8", staffId: "st-8", name: "Yuki Tanaka", email: "yuki.tanaka@abapro.health", status: "suspended", roleIds: ["role-cco"], mfa: false, devices: 1, invitedDaysAgo: 120, lastLoginHoursAgo: 200, statusChangedDaysAgo: 4, statusChangedBy: OWNER },
  { id: "ad-9", staffId: "st-9", name: "Carlos Mendes", email: "carlos.mendes@abapro.health", status: "deactivated", roleIds: ["role-content"], mfa: false, devices: 0, invitedDaysAgo: 220, lastLoginHoursAgo: 900, statusChangedDaysAgo: 20, statusChangedBy: OWNER },
  { id: "ad-10", staffId: "st-10", name: "Aisha Bello", email: "aisha.bello@abapro.health", status: "revoked", roleIds: ["role-admin"], mfa: false, devices: 0, invitedDaysAgo: 6, lastLoginHoursAgo: null, statusChangedDaysAgo: 5, statusChangedBy: DANA },
  { id: "ad-11", staffId: "st-11", name: "Noah Weiss", email: "noah.weiss@abapro.health", status: "active", roleIds: ["role-supervisor"], mfa: true, devices: 2, invitedDaysAgo: 75, lastLoginHoursAgo: 5, willFail: true },
  { id: "ad-12", staffId: "st-12", name: "Sofia Rossi", email: "sofia.rossi@abapro.health", status: "active", roleIds: ["role-content"], mfa: false, devices: 1, invitedDaysAgo: 45, lastLoginHoursAgo: 30 },
  { id: "ad-13", staffId: "st-13", name: "Ivan Petrov", email: "ivan.petrov@abapro.health", status: "active", roleIds: ["role-cco"], mfa: false, devices: 1, invitedDaysAgo: 33, lastLoginHoursAgo: 72 },
  { id: "ad-14", staffId: "st-14", name: "Grace Kim", email: "grace.kim@abapro.health", status: "pending", roleIds: ["role-admin"], mfa: false, devices: 0, invitedDaysAgo: 2, lastLoginHoursAgo: null, inviteSentMinsAgo: 2880 },
  { id: "ad-15", staffId: "st-15", name: "Hassan Ali", email: "hassan.ali@abapro.health", status: "suspended", roleIds: ["role-supervisor"], mfa: true, devices: 1, invitedDaysAgo: 140, lastLoginHoursAgo: 300, statusChangedDaysAgo: 8, statusChangedBy: DANA },
  { id: "ad-16", staffId: "st-16", name: "Emma Novak", email: "emma.novak@abapro.health", status: "active", roleIds: ["role-refund"], mfa: true, devices: 2, invitedDaysAgo: 20, lastLoginHoursAgo: 1 },
  { id: "ad-17", staffId: "st-17", name: "Diego Silva", email: "diego.silva@abapro.health", status: "active", roleIds: ["role-cco"], mfa: false, devices: 1, invitedDaysAgo: 55, lastLoginHoursAgo: 14 },
  { id: "ad-18", staffId: "st-18", name: "Fatima Zahra", email: "fatima.zahra@abapro.health", status: "deactivated", roleIds: ["role-cco"], mfa: false, devices: 0, invitedDaysAgo: 260, lastLoginHoursAgo: 1500, statusChangedDaysAgo: 40, statusChangedBy: OWNER },
  { id: "ad-19", staffId: "st-19", name: "Liam O'Brien", email: "liam.obrien@abapro.health", status: "active", roleIds: ["role-content"], mfa: false, devices: 1, invitedDaysAgo: 28, lastLoginHoursAgo: 50 },
  { id: "ad-20", staffId: "st-20", name: "Nadia Kaur", email: "nadia.kaur@abapro.health", status: "active", roleIds: ["role-admin"], mfa: true, devices: 3, invitedDaysAgo: 100, lastLoginHoursAgo: 4 },
  { id: "ad-21", staffId: "st-21", name: "Marcus Cole", email: "marcus.cole@abapro.health", status: "revoked", roleIds: ["role-cco"], mfa: false, devices: 0, invitedDaysAgo: 15, lastLoginHoursAgo: null, statusChangedDaysAgo: 12, statusChangedBy: OWNER },
  { id: "ad-22", staffId: "st-22", name: "Elena Popova", email: "elena.popova@abapro.health", status: "active", roleIds: ["role-supervisor"], mfa: false, devices: 1, invitedDaysAgo: 66, lastLoginHoursAgo: 20 },
  { id: "ad-23", staffId: "st-23", name: "Tariq Aziz", email: "tariq.aziz@abapro.health", status: "active", roleIds: ["role-cco", "role-content"], mfa: false, devices: 2, invitedDaysAgo: 48, lastLoginHoursAgo: 36 },
  { id: "ad-24", staffId: "st-24", name: "Chloe Martin", email: "chloe.martin@abapro.health", status: "active", roleIds: ["role-admin", "role-supervisor", "role-content", "role-refund"], mfa: true, devices: 3, invitedDaysAgo: 200, lastLoginHoursAgo: 8 },
  { id: "ad-25", staffId: "st-25", name: "Ravi Menon", email: "ravi.menon@abapro.health", status: "pending", roleIds: ["role-cco"], mfa: false, devices: 0, invitedDaysAgo: 3, lastLoginHoursAgo: null, inviteSentMinsAgo: 4320 },
  { id: "ad-26", staffId: "st-26", name: "Julia Berg", email: "julia.berg@abapro.health", status: "active", roleIds: ["role-content"], mfa: false, devices: 1, invitedDaysAgo: 38, lastLoginHoursAgo: 60 },
  { id: "ad-27", staffId: "st-27", name: "Kofi Mensah", email: "kofi.mensah@abapro.health", status: "suspended", roleIds: ["role-admin"], mfa: true, devices: 1, invitedDaysAgo: 160, lastLoginHoursAgo: 260, statusChangedDaysAgo: 2, statusChangedBy: OWNER },
  { id: "ad-28", staffId: "st-28", name: "Mei Lin", email: "mei.lin@abapro.health", status: "active", roleIds: ["role-supervisor"], mfa: true, devices: 2, invitedDaysAgo: 84, lastLoginHoursAgo: 12 },
  { id: "ad-29", staffId: "st-29", name: "Andre Dubois", email: "andre.dubois@abapro.health", status: "active", roleIds: ["role-cco"], mfa: false, devices: 1, invitedDaysAgo: 41, lastLoginHoursAgo: 90 },
  { id: "ad-30", staffId: "st-30", name: "Sara Haugen", email: "sara.haugen@abapro.health", status: "active", roleIds: ["role-superadmin"], mfa: true, devices: 2, invitedDaysAgo: 300, lastLoginHoursAgo: 3 },
];

export function seedAdminUsers(): AdminUser[] {
  return SEEDS.map(build);
}
