import { isRedacted, isSensitiveField, maskIdentifier, maskColumnValue, maskInputValue, maskKey } from "./mask";

describe("maskIdentifier", () => {
  it("masks the local part and domain of an email but keeps the TLD", () => {
    expect(maskIdentifier("jane@acme.ae")).toBe("j***@***.ae");
    expect(maskIdentifier("bob@sub.example.com")).toBe("b***@***.com");
  });

  it("masks a single-character local part", () => {
    expect(maskIdentifier("a@x.io")).toBe("a***@***.io");
  });

  it("handles a domain with no dot", () => {
    expect(maskIdentifier("jane@localhost")).toBe("j***@***");
  });

  it("masks a non-email identifier", () => {
    expect(maskIdentifier("username")).toBe("u***");
    expect(maskIdentifier("a")).toBe("***");
    expect(maskIdentifier("")).toBe("***");
  });
});

describe("maskColumnValue", () => {
  it("masks sensitive columns and email-looking values, passes the rest through", () => {
    expect(maskColumnValue("email", "jane@acme.ae")).toBe("j***@***.ae");
    expect(maskColumnValue("password_reset_token", "s3cr3t")).toBe("s••••");
    expect(maskColumnValue("owner", "bob@x.io")).toBe("b***@***.io");
    expect(maskColumnValue("status", "refunded")).toBe("refunded");
    expect(maskColumnValue("refunded_amount", "450.00")).toBe("450.00");
    expect(maskColumnValue("name", null)).toBeNull();
  });
});

describe("maskInputValue", () => {
  it("masks by sensitive label or email value, leaves amounts visible", () => {
    expect(maskInputValue("Client", "j***@***.ae")).toBe("j***@***.ae");
    expect(maskInputValue("Password", "hunter2")).toBe("h••••");
    expect(maskInputValue("Amount", "AED 450.00")).toBe("AED 450.00");
    expect(maskInputValue("Reason", "Duplicate charge")).toBe("Duplicate charge");
  });
});

describe("isRedacted", () => {
  it("recognises values the masking made unreadable", () => {
    expect(isRedacted(maskColumnValue("password_reset_token", "s3cr3t"))).toBe(true);
    expect(isRedacted(maskInputValue("Password", "ab"))).toBe(true);
  });

  it("leaves readable and masked email values alone", () => {
    expect(isRedacted(maskColumnValue("email", "jane@acme.ae"))).toBe(false);
    expect(isRedacted("refunded")).toBe(false);
    expect(isRedacted(null)).toBe(false);
  });
});

describe("isSensitiveField", () => {
  it("covers PINs, card codes, keys, cookies, IPs, addresses and links", () => {
    for (const field of ["pin", "card_pin", "cvc", "private_key", "signing_key", "jwt", "cookie", "signature", "ip", "client_ip", "ip_address", "address", "invite.link", "callback_url"]) {
      expect(isSensitiveField(field)).toBe(true);
    }
  });

  it("leaves look-alike words alone", () => {
    for (const field of ["shipping", "pinned", "linked_role", "status", "name"]) {
      expect(isSensitiveField(field)).toBe(false);
    }
  });
});

describe("maskKey", () => {
  it("masks an email used as a key", () => {
    expect(maskKey("jane@acme.ae")).toBe("j***@***.ae");
    expect(maskKey("status")).toBe("status");
  });
});

