import { test, expect } from "@playwright/test";

const envelope = (data: unknown, extra: Record<string, unknown> = {}) => ({
  success: true,
  message: "ok",
  data,
  status: 200,
  ...extra,
});

const listMeta = (total: number) => ({
  meta: { current_page: 1, last_page: 1, per_page: 100, total, from: total ? 1 : null, to: total || null },
  links: {},
});

type Template = {
  id: number;
  code: string;
  name: string;
  channel_id: number;
  subject: Record<string, string>;
  body: Record<string, string>;
  is_active: boolean;
};

test.beforeEach(async ({ page }) => {
  await page.route("**/notification-channels**", (route) =>
    route.fulfill({
      json: envelope([{ id: 1, code: "IN_APP", name: "In-app inbox", is_active: true }], listMeta(1)),
    }),
  );

  const templates: Template[] = [
    { id: 1, code: "AUTH_OTP", name: "OTP", channel_id: 1, subject: { EN: "Code" }, body: { EN: "<p>Your code</p>" }, is_active: true },
  ];

  await page.route("**/notification-templates**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const created = { id: templates.length + 1, ...(request.postDataJSON() as Omit<Template, "id">) };
      templates.push(created);
      return route.fulfill({ status: 201, json: envelope(created, { status: 201 }) });
    }
    return route.fulfill({ json: envelope(templates, listMeta(templates.length)) });
  });
});

test("creates a message template against the real API shape", async ({ page }) => {
  await page.goto("/admin/notifications/templates");
  await expect(page.getByText("AUTH_OTP").first()).toBeVisible();

  await page.getByRole("button", { name: "New template" }).click();
  await page.getByLabel("Message code").fill("SYS_TEST_E2E");
  await page.getByLabel("Name").fill("E2E template");
  await page.getByLabel("Subject (English)").fill("E2E subject");
  await page.getByLabel("English copy").fill("Hello from the E2E test.");
  await page.getByRole("button", { name: "Create template" }).click();

  await expect(page.getByText("SYS_TEST_E2E").first()).toBeVisible();
});
