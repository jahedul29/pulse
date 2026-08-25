import { escapeCell } from "./csv";

describe("escapeCell", () => {
  it("prefixes formula-injection triggers with a single quote", () => {
    expect(escapeCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCell("+1")).toBe("'+1");
    expect(escapeCell("-1")).toBe("'-1");
    expect(escapeCell("@cmd")).toBe("'@cmd");
    expect(escapeCell("\tx")).toBe("'\tx");
    expect(escapeCell("\rx")).toBe("'\rx");
  });

  it("leaves safe values untouched", () => {
    expect(escapeCell("hello")).toBe("hello");
    expect(escapeCell(42)).toBe("42");
  });

  it("wraps and doubles quotes for comma, quote, or newline", () => {
    expect(escapeCell("a,b")).toBe('"a,b"');
    expect(escapeCell('he said "hi"')).toBe('"he said ""hi"""');
    expect(escapeCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("both neutralizes injection and wraps when a comma is present", () => {
    expect(escapeCell("=1,2")).toBe("\"'=1,2\"");
  });
});
