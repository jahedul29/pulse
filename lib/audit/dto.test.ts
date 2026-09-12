import { accountName, loginAuditDtoToEntry, toEpoch, type LoginAuditLogDto } from "./dto";

describe("toEpoch / accountName", () => {
  it("parses ISO to epoch, 0 for missing/invalid", () => {
    expect(toEpoch("2026-09-10T13:24:00Z")).toBe(Date.parse("2026-09-10T13:24:00Z"));
    expect(toEpoch(null)).toBe(0);
    expect(toEpoch("nonsense")).toBe(0);
  });

  it("builds a name from staff, falls back to email then null", () => {
    expect(accountName({ staff: { first_name: "Dana", last_name: "Okonkwo" } })).toBe("Dana Okonkwo");
    expect(accountName({ email: "dana@x.com" })).toBe("dana@x.com");
    expect(accountName(null)).toBeNull();
    expect(accountName({})).toBeNull();
  });
});

describe("loginAuditDtoToEntry", () => {
  const dto: LoginAuditLogDto = {
    id: "la-1",
    admin_account_id: "ad-1",
    admin_account: { id: "ad-1", email: "dana@x.com", staff: { first_name: "Dana", last_name: "Okonkwo" } },
    attempted_identifier: "dana@abapro.health",
    result: "SUCCESS",
    method: "PASSWORD_MFA",
    user_agent: "Mozilla/5.0 (Macintosh) Chrome/120",
    created_at: "2026-09-10T13:24:00Z",
  };

  it("maps identity, raw result/method, device from user_agent, drops ip", () => {
    const entry = loginAuditDtoToEntry(dto);
    expect(entry.id).toBe("la-1");
    expect(entry.adminAccountId).toBe("ad-1");
    expect(entry.adminName).toBe("Dana Okonkwo");
    expect(entry.attemptedIdentifier).toBe("dana@abapro.health");
    expect(entry.result).toBe("SUCCESS");
    expect(entry.method).toBe("PASSWORD_MFA");
    expect(entry.device).toBe("Chrome · macOS");
    expect(entry.ip).toBe("");
    expect(entry.createdAt).toBe(Date.parse("2026-09-10T13:24:00Z"));
  });

  it("unmatched login → adminName null, no device without user_agent", () => {
    const entry = loginAuditDtoToEntry({ ...dto, admin_account_id: null, admin_account: null, user_agent: null });
    expect(entry.adminAccountId).toBeNull();
    expect(entry.adminName).toBeNull();
    expect(entry.device).toBe("");
  });
});
