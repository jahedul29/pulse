import {
  fetchAdminActions,
  fetchActionDetail,
  fetchChangeLog,
  fetchChangeDetail,
} from "./api";

describe("detail seams", () => {
  it("fetchActionDetail returns the action by id, null otherwise", async () => {
    const [first] = await fetchAdminActions();
    expect(first).toBeDefined();
    const detail = await fetchActionDetail(first.id);
    expect(detail?.id).toBe(first.id);
    expect(await fetchActionDetail("does-not-exist")).toBeNull();
  });

  it("fetchChangeDetail returns the change entry by id, null otherwise", async () => {
    const [first] = await fetchChangeLog();
    expect(first).toBeDefined();
    const detail = await fetchChangeDetail(first.id);
    expect(detail?.id).toBe(first.id);
    expect(await fetchChangeDetail("does-not-exist")).toBeNull();
  });
});
