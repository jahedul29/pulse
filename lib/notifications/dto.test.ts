import {
  audienceCount,
  buildAudienceFilter,
  deliveryStatusTone,
  localizedText,
  normalizeAudienceFilter,
  recipientName,
} from "./dto";
import type { NotificationAlertRouteDto } from "./dto";

describe("localizedText", () => {
  it("returns the requested locale", () => {
    expect(localizedText({ EN: "Hello", AR: "مرحبا" }, "ar")).toBe("مرحبا");
    expect(localizedText({ EN: "Hello", AR: "مرحبا" }, "en")).toBe("Hello");
  });

  it("falls back to EN when the locale is missing", () => {
    expect(localizedText({ EN: "Hello" }, "ar")).toBe("Hello");
  });

  it("returns empty string for nullish text", () => {
    expect(localizedText(null, "en")).toBe("");
    expect(localizedText(undefined, "en")).toBe("");
  });
});

describe("normalizeAudienceFilter", () => {
  it("treats an empty array as no recipients", () => {
    expect(normalizeAudienceFilter([])).toEqual({ role_ids: [], user_ids: [] });
  });

  it("treats null as no recipients", () => {
    expect(normalizeAudienceFilter(null)).toEqual({ role_ids: [], user_ids: [] });
  });

  it("reads role_ids and user_ids from an object", () => {
    expect(normalizeAudienceFilter({ role_ids: [1, 2] })).toEqual({ role_ids: [1, 2], user_ids: [] });
    expect(normalizeAudienceFilter({ user_ids: ["a", "b"] })).toEqual({ role_ids: [], user_ids: ["a", "b"] });
  });
});

describe("buildAudienceFilter", () => {
  it("returns an empty array for ALL_ADMINS", () => {
    expect(buildAudienceFilter("ALL_ADMINS", [])).toEqual([]);
  });

  it("maps ROLE ids to numeric role_ids", () => {
    expect(buildAudienceFilter("ROLE", ["1", "2"])).toEqual({ role_ids: [1, 2] });
  });

  it("keeps USER_IDS as string uuids", () => {
    expect(buildAudienceFilter("USER_IDS", ["u1", "u2"])).toEqual({ user_ids: ["u1", "u2"] });
  });
});

describe("audienceCount", () => {
  const base: NotificationAlertRouteDto = {
    id: 1,
    code: "C",
    name: "N",
    channel_id: 1,
    template_id: null,
    audience_type: "ALL_ADMINS",
    audience_filter: [],
    priority: 0,
    is_active: true,
  };

  it("is null for ALL_ADMINS", () => {
    expect(audienceCount(base)).toBeNull();
  });

  it("counts roles", () => {
    expect(audienceCount({ ...base, audience_type: "ROLE", audience_filter: { role_ids: [1, 2, 3] } })).toBe(3);
  });

  it("counts users", () => {
    expect(audienceCount({ ...base, audience_type: "USER_IDS", audience_filter: { user_ids: ["a"] } })).toBe(1);
  });
});

describe("deliveryStatusTone", () => {
  it("maps statuses to tones", () => {
    expect(deliveryStatusTone("SENT")).toBe("success");
    expect(deliveryStatusTone("FAILED")).toBe("danger");
    expect(deliveryStatusTone("PENDING")).toBe("warning");
  });
});

describe("recipientName", () => {
  const base = { id: "d-1", admin_account_id: "01a0af2a-c372-7318-beda-d54750399138" } as Parameters<typeof recipientName>[0];

  it("prefers the BE full_name, then staff name, then email, then a short id", () => {
    expect(
      recipientName({ ...base, admin_account: { id: "u", full_name: "System Admin", staff: { first_name: "A", last_name: "B" } } }),
    ).toBe("System Admin");
    expect(recipientName({ ...base, admin_account: { id: "u", staff: { first_name: "Dana", last_name: "Okonkwo" } } })).toBe(
      "Dana Okonkwo",
    );
    expect(recipientName({ ...base, admin_account: { id: "u", email: "dana@x.com" } })).toBe("dana@x.com");
    expect(recipientName({ ...base, admin_account: null })).toBe("01a0af2a…");
  });
});
