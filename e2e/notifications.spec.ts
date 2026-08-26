import { test, expect } from "@playwright/test";

test("creates a response-message template", async ({ page }) => {
  await page.goto("/admin/notifications/templates");
  await expect(page.getByText("AUTH_OTP").first()).toBeVisible();

  await page.getByRole("button", { name: "New template" }).click();
  await page.getByLabel("Message code").fill("SYS_TEST_E2E");
  await page.getByLabel("English copy").fill("Hello from the E2E test.");
  await page.getByLabel("Arabic copy").fill("مرحبا من اختبار E2E.");
  await page.getByRole("button", { name: "Create template" }).click();

  await expect(page.getByText("SYS_TEST_E2E").first()).toBeVisible();
});
