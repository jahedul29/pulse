import { authenticate, verifyMfa, MFA_CODE } from "./mock";

describe("authenticate", () => {
  it("signs in an active account without MFA", async () => {
    expect((await authenticate("owner@abapro.health", "abapro", false)).result).toBe("SUCCESS");
  });

  it("requires MFA for an MFA-enabled account unless the device is remembered", async () => {
    expect((await authenticate("admin@abapro.health", "abapro", false)).result).toBe("MFA_REQUIRED");
    expect((await authenticate("admin@abapro.health", "abapro", true)).result).toBe("SUCCESS");
  });

  it("rejects a wrong password and an unknown account", async () => {
    expect((await authenticate("owner@abapro.health", "nope", false)).result).toBe("INVALID_CREDENTIALS");
    expect((await authenticate("nobody@abapro.health", "abapro", false)).result).toBe("INVALID_CREDENTIALS");
  });

  it("surfaces non-active account states", async () => {
    expect((await authenticate("locked@abapro.health", "abapro", false)).result).toBe("ACCOUNT_LOCKED");
    expect((await authenticate("suspended@abapro.health", "abapro", false)).result).toBe("ACCOUNT_SUSPENDED");
    expect((await authenticate("error@abapro.health", "abapro", false)).result).toBe("SERVER_ERROR");
  });
});

describe("verifyMfa", () => {
  it("accepts the correct code", async () => {
    expect((await verifyMfa("admin@abapro.health", MFA_CODE)).result).toBe("SUCCESS");
  });

  it("rejects an incorrect code", async () => {
    expect((await verifyMfa("admin@abapro.health", "000000")).result).toBe("INVALID_CREDENTIALS");
  });
});
