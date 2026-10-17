import { safeInternalPath } from "./safe-path";

describe("safeInternalPath", () => {
  it("keeps an internal path with its query and hash", () => {
    expect(safeInternalPath("/admin/roles?page=2#top")).toBe("/admin/roles?page=2#top");
  });

  it("rejects paths that would leave the site", () => {
    for (const path of [
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "/\r/evil.example",
      "/\t\\evil.example",
      "/..//evil.example",
      "/.//evil.example/x?y",
      "/%2e%2e//evil.example",
      "/admin/..//evil.example",
      42,
      "https://evil.example",
      "javascript:alert(1)",
      "admin/roles",
      "",
      null,
      undefined,
    ]) {
      expect(safeInternalPath(path)).toBeNull();
    }
  });

  it("normalises dot segments without leaving the site", () => {
    expect(safeInternalPath("/admin/../admin/roles")).toBe("/admin/roles");
  });
});
