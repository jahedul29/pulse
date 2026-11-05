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
  type: "NOTIFICATION" | "POPUP";
  channel_id: number;
  header_title: Record<string, string> | null;
  subject: Record<string, string> | null;
  body: Record<string, string>;
  button_label: Record<string, string> | null;
  is_active: boolean;
};

let posted: Record<string, unknown>[] = [];

test.beforeEach(async ({ page }) => {
  posted = [];
  await page.route("**/notification-channels**", (route) =>
    route.fulfill({
      json: envelope([{ id: 1, code: "IN_APP", name: "In-app inbox", is_active: true }], listMeta(1)),
    }),
  );

  const templates: Template[] = [
    {
      id: 1,
      code: "AUTH_OTP",
      name: "OTP",
      type: "NOTIFICATION",
      channel_id: 1,
      header_title: { EN: "Your code" },
      subject: { EN: "Code" },
      body: { EN: "<p>Your code</p>" },
      button_label: { EN: "OK" },
      is_active: true,
    },
  ];

  await page.route("**/notification-templates**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as Omit<Template, "id">;
      posted.push(body);
      const created = { id: templates.length + 1, ...body };
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
  await page.getByLabel(/^Name/).fill("E2E template");
  await page.getByLabel(/^Bar title \(English\)/).fill("E2E bar title");
  await page.getByLabel(/^Subject \(English\)/).fill("E2E subject");
  await page.getByLabel("English copy").fill("Hello from the E2E test.");
  await page.getByRole("button", { name: "Create template" }).click();

  await expect(page.getByText("SYS_TEST_E2E").first()).toBeVisible();
});

test("creates a popup template that sends only the message and button", async ({ page }) => {
  await page.goto("/admin/notifications/templates");
  await expect(page.getByText("AUTH_OTP").first()).toBeVisible();

  await page.getByRole("button", { name: "New template" }).click();
  await page.getByRole("combobox", { name: /^Type/ }).click();
  await page.getByRole("option", { name: "Popup" }).click();
  await expect(page.getByLabel(/^Bar title \(English\)/)).toHaveCount(0);
  await page.getByLabel("Message code").fill("POPUP_E2E");
  await page.getByLabel(/^Name/).fill("E2E popup");
  await page.getByLabel("English copy").fill("Your number is verified.");
  await page.getByRole("button", { name: "Create template" }).click();

  await expect(page.getByText("POPUP_E2E").first()).toBeVisible();
  expect(posted.at(-1)).toMatchObject({
    code: "POPUP_E2E",
    type: "POPUP",
    icon: null,
    sender_name: null,
    header_title: null,
    header_subtitle: null,
    subject: null,
    button_label: { EN: "OK", AR: "حسناً" },
  });
});
