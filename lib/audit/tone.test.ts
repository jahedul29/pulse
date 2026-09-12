import { auditTone } from "./tone";

describe("auditTone (best-effort, raw BE strings)", () => {
  it("maps login result keywords", () => {
    expect(auditTone("SUCCESS")).toBe("success");
    expect(auditTone("ACCOUNT_LOCKED")).toBe("warning");
    expect(auditTone("INVALID_CREDENTIALS")).toBe("danger");
    expect(auditTone("MFA_REQUIRED")).toBe("danger");
    expect(auditTone("SERVER_ERROR")).toBe("danger");
  });

  it("maps action result/severity keywords", () => {
    expect(auditTone("success")).toBe("success");
    expect(auditTone("partial")).toBe("warning");
    expect(auditTone("failure")).toBe("danger");
    expect(auditTone("info")).toBe("neutral");
    expect(auditTone("warning")).toBe("warning");
    expect(auditTone("critical")).toBe("danger");
  });

  it("maps change operations", () => {
    expect(auditTone("insert")).toBe("success");
    expect(auditTone("update")).toBe("warning");
    expect(auditTone("delete")).toBe("danger");
  });

  it("falls back to neutral for unknown values", () => {
    expect(auditTone("something_else")).toBe("neutral");
    expect(auditTone("")).toBe("neutral");
  });
});
