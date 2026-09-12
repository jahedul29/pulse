import {
  initialsOf,
  invitationDtoToRow,
  normalizeInvitationStatus,
  normalizeStatus,
  staffDtoToRecord,
  toWireStatus,
  userDtoToRow,
  type InvitationDto,
  type StaffDto,
  type UserDto,
} from "./dto";

describe("normalizeStatus / toWireStatus", () => {
  it("maps wire statuses to app statuses, case-insensitive", () => {
    expect(normalizeStatus("ACTIVE")).toBe("active");
    expect(normalizeStatus("suspended")).toBe("suspended");
    expect(normalizeStatus("DEACTIVATED")).toBe("deactivated");
    expect(normalizeStatus("PENDING")).toBe("pending");
  });

  it("falls back to pending for unknown wire values", () => {
    expect(normalizeStatus("WHATEVER")).toBe("pending");
    expect(normalizeStatus("")).toBe("pending");
  });

  it("round-trips the four backed statuses; drops app-only ones", () => {
    expect(toWireStatus("active")).toBe("ACTIVE");
    expect(toWireStatus("deactivated")).toBe("DEACTIVATED");
    expect(toWireStatus("locked" as never)).toBeUndefined();
    expect(toWireStatus("revoked")).toBeUndefined();
  });
});

describe("normalizeInvitationStatus (interim, un-enumed)", () => {
  it("maps accepted/revoked/other to app statuses", () => {
    expect(normalizeInvitationStatus("ACCEPTED")).toBe("active");
    expect(normalizeInvitationStatus("revoked")).toBe("revoked");
    expect(normalizeInvitationStatus("cancelled")).toBe("revoked");
    expect(normalizeInvitationStatus("pending")).toBe("pending");
    expect(normalizeInvitationStatus("")).toBe("pending");
  });
});

describe("initialsOf", () => {
  it("takes first letters of the first two words, uppercased", () => {
    expect(initialsOf("Dana Okonkwo")).toBe("DO");
    expect(initialsOf("owen")).toBe("O");
    expect(initialsOf("")).toBe("");
  });
});

describe("userDtoToRow", () => {
  const dto: UserDto = {
    id: "11111111-1111-1111-1111-111111111111",
    staff_id: 42,
    email: "dana@abapro.health",
    preferred_language: "en",
    status: "ACTIVE",
    invited_by_admin_id: "22222222-2222-2222-2222-222222222222",
    activated_at: "2026-01-02T10:00:00Z",
    last_login_at: "2026-09-01T08:00:00Z",
    created_at: "2026-01-01T09:00:00Z",
    updated_at: "2026-09-02T09:00:00Z",
    staff: { id: 42, first_name: "Dana", last_name: "Okonkwo" },
    roles: [
      { id: 3, name: "Administrator" },
      { id: 7, name: "Supervisor" },
    ],
  };

  it("maps identity, status, name and derived fields", () => {
    const row = userDtoToRow(dto);
    expect(row.id).toBe(dto.id);
    expect(row.staffId).toBe("42");
    expect(row.name).toBe("Dana Okonkwo");
    expect(row.initials).toBe("DO");
    expect(row.status).toBe("active");
    expect(row.effectiveStatus).toBe("active");
    expect(row.resendReady).toBe(false);
    expect(row.preferredLanguage).toBe("en");
  });

  it("carries role refs and ids", () => {
    const row = userDtoToRow(dto);
    expect(row.roleIds).toEqual(["3", "7"]);
    expect(row.roles).toEqual([
      { id: "3", name: "Administrator" },
      { id: "7", name: "Supervisor" },
    ]);
  });

  it("parses timestamps to epoch ms and null for missing", () => {
    const row = userDtoToRow(dto);
    expect(row.lastLogin).toBe(Date.parse("2026-09-01T08:00:00Z"));
    expect(row.activatedAt).toBe(Date.parse("2026-01-02T10:00:00Z"));
    const noDates = userDtoToRow({ ...dto, last_login_at: null, activated_at: undefined });
    expect(noDates.lastLogin).toBeNull();
    expect(noDates.activatedAt).toBeNull();
  });

  it("falls back to email when staff name is absent; hard-blocked fields default off", () => {
    const row = userDtoToRow({ ...dto, staff: null });
    expect(row.name).toBe("dana@abapro.health");
    expect(row.lockedUntil).toBeNull();
    expect(row.registeredDevices).toBe(0);
  });
});

describe("invitationDtoToRow", () => {
  const dto: InvitationDto = {
    id: "33333333-3333-3333-3333-333333333333",
    staff_id: 9,
    email: "omar@abapro.health",
    status: "pending",
    expires_at: "2026-09-20T00:00:00Z",
    created_at: "2026-09-10T00:00:00Z",
    staff: { id: 9, first_name: "Omar", last_name: "Haddad" },
  };

  it("builds a pending row that carries its invitation id for revoke", () => {
    const row = invitationDtoToRow(dto);
    expect(row.status).toBe("pending");
    expect(row.invitationId).toBe(dto.id);
    expect(row.id).toBe(dto.id);
    expect(row.name).toBe("Omar Haddad");
    expect(row.email).toBe("omar@abapro.health");
    expect(row.roleIds).toEqual([]);
  });
});

describe("staffDtoToRecord", () => {
  it("maps staff and derives terminated from termination_date", () => {
    const active: StaffDto = { id: 1, first_name: "Grace", last_name: "Kim", personal_email: "grace@x.com" };
    const gone: StaffDto = { ...active, id: 2, termination_date: "2025-05-01" };
    expect(staffDtoToRecord(active)).toMatchObject({ id: "1", name: "Grace Kim", terminated: false });
    expect(staffDtoToRecord(gone).terminated).toBe(true);
  });
});
