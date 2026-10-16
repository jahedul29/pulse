import { test, expect } from "@playwright/test";
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from "../lib/auth/idle";
import { mockAdminIdentity } from "./support/mock-admin-identity";

test.beforeEach(async ({ page }) => {
  await mockAdminIdentity(page);
});

test("warns before the idle sign-out and keeps the admin signed in on request", async ({ page }) => {
  await page.clock.install();
  await page.goto("/admin/roles");
  await expect(page.getByRole("button", { name: "New role" })).toBeVisible();

  await page.clock.fastForward(IDLE_TIMEOUT_MS - IDLE_WARNING_MS + 1000);
  const warning = page.getByRole("alertdialog", { name: "Are you still there?" });
  await expect(warning).toBeVisible();
  await warning.getByRole("button", { name: "Stay signed in" }).click();
  await expect(warning).toBeHidden();
  await expect(page).toHaveURL(/\/admin\/roles$/);
});

test("signs out after the idle timeout and returns to the page after signing in", async ({ page }) => {
  await page.clock.install();
  await page.goto("/admin/roles");
  await expect(page.getByRole("button", { name: "New role" })).toBeVisible();

  await page.clock.fastForward(IDLE_TIMEOUT_MS + 5000);
  await expect(page).toHaveURL(/\/login\?reason=idle&returnTo=%2Fadmin%2Froles/);
  await expect(page.getByText("Signed out for inactivity")).toBeVisible();

  await page.getByLabel(/^Email/).fill("owner@abapro.health");
  await page.getByLabel(/^Password/).fill("abapro");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/admin\/roles$/);
});
