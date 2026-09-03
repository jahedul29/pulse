import { test, expect } from "@playwright/test";
import { mockAdminIdentity } from "./support/mock-admin-identity";

test.beforeEach(async ({ page }) => {
  await mockAdminIdentity(page);
});

test("creates a custom role, sets a permission, and saves", async ({ page }) => {
  await page.goto("/admin/roles");
  await expect(page.getByRole("button", { name: "New role" })).toBeVisible();

  await page.getByRole("button", { name: "New role" }).click();
  await page.getByLabel("Role name").fill("QA Reviewer");
  await page.getByRole("button", { name: "Create role" }).click();

  await expect(page).toHaveURL(/\/admin\/roles\/\d+/);

  await page.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(/\/admin\/roles$/);
  await expect(page.getByRole("link", { name: "QA Reviewer" })).toBeVisible();
});
