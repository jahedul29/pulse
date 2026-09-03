import { fetchNotificationLog, fetchTemplateDetail, fetchTemplates } from "./api";

describe("notification api seams", () => {
  it("fetchTemplates returns templates newest-updated first", async () => {
    const templates = await fetchTemplates();
    expect(templates.length).toBeGreaterThan(0);
    for (let i = 1; i < templates.length; i++) {
      expect(templates[i - 1].updatedAt).toBeGreaterThanOrEqual(templates[i].updatedAt);
    }
  });

  it("fetchTemplateDetail returns by code, null otherwise", async () => {
    expect((await fetchTemplateDetail("AUTH_OTP"))?.code).toBe("AUTH_OTP");
    expect(await fetchTemplateDetail("NOPE")).toBeNull();
  });

  it("fetchNotificationLog filters by role, category and status", async () => {
    const all = await fetchNotificationLog();
    expect(all.length).toBeGreaterThan(0);

    const clientsOnly = await fetchNotificationLog({ roles: ["client"] });
    expect(clientsOnly.every((entry) => entry.recipientRole === "client")).toBe(true);

    const failed = await fetchNotificationLog({ statuses: ["failed"] });
    expect(failed.every((entry) => entry.status === "failed")).toBe(true);

    const auth = await fetchNotificationLog({ categories: ["auth"] });
    expect(auth.every((entry) => entry.category === "auth")).toBe(true);
  });

  it("fetchNotificationLog sorts newest first", async () => {
    const log = await fetchNotificationLog();
    for (let i = 1; i < log.length; i++) {
      expect(log[i - 1].createdAt).toBeGreaterThanOrEqual(log[i].createdAt);
    }
  });
});
