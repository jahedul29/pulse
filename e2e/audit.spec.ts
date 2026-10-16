import { test, expect } from "@playwright/test";
import { mockAdminIdentity } from "./support/mock-admin-identity";

test.beforeEach(async ({ page }) => {
  await mockAdminIdentity(page);
});

test("lists semantic actions and opens a detail drawer", async ({ page }) => {
  await page.goto("/admin/audit/actions");
  const row = page.getByRole("link", { name: "CLIENT_REFUND" });
  await expect(row).toBeVisible();
  await expect(row.getByText("Order", { exact: true })).toBeVisible();
  await expect(row.getByText("Financial", { exact: true })).toBeVisible();

  await row.click();
  await expect(page.getByText("Target type")).toBeVisible();
  await expect(page.getByText("Refund client order").first()).toBeVisible();
  await expect(page.getByText("Permissions (1)")).toBeVisible();
  await expect(page.getByText("Manage Orders module.")).toBeVisible();
  await expect(page.getByText("corr-1")).toBeVisible();
  await expect(page.getByText("c".repeat(64))).toBeVisible();
  await expect(page.getByText("Request details")).toBeVisible();
});

test("drills from a row-level change into its linked action", async ({ page }) => {
  await page.goto("/admin/audit/changes");
  await expect(page.getByText("Orders").first()).toBeVisible();

  await page.getByRole("link", { name: "Update · Orders" }).click();
  await expect(page.getByText("a".repeat(64))).toBeVisible();
  await expect(page.getByText("b".repeat(64))).toBeVisible();
  const viewAction = page.getByRole("link", { name: "Open action log entry Refunded a client order" });
  await expect(viewAction).toBeVisible();
  await expect(page.getByRole("link", { name: "Open admin account Dana Okonkwo" })).toBeVisible();
  await viewAction.click();

  await expect(page).toHaveURL(/\/admin\/audit\/actions\?open=/);
});
