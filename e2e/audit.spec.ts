import { test, expect } from "@playwright/test";
import { mockAdminIdentity } from "./support/mock-admin-identity";

test.beforeEach(async ({ page }) => {
  await mockAdminIdentity(page);
});

test("lists semantic actions and opens a detail drawer", async ({ page }) => {
  await page.goto("/admin/audit/actions");
  await expect(page.getByText("Refund client order").first()).toBeVisible();

  await page.getByRole("link", { name: "CLIENT_REFUND" }).click();
  await expect(page.getByText("Target type")).toBeVisible();
  await expect(page.getByText("Refund client order").first()).toBeVisible();
});

test("drills from a row-level change into its linked action", async ({ page }) => {
  await page.goto("/admin/audit/changes");
  await expect(page.getByText("orders").first()).toBeVisible();

  await page.getByRole("link", { name: "orders ord-88" }).click();
  const viewAction = page.getByRole("button", { name: "View action log" });
  await expect(viewAction).toBeVisible();
  await viewAction.click();

  await expect(page).toHaveURL(/\/admin\/audit\/actions\?open=/);
});
