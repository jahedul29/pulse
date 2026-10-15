import { test, expect } from "@playwright/test";
import { mockAdminIdentity } from "./support/mock-admin-identity";

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await mockAdminIdentity(page);
});

test("rejects invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill("owner@abapro.health");
  await page.getByLabel(/^Password/).fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  const banner = page.getByRole("alert");
  await expect(banner).toContainText("Incorrect email or password");
  await expect(banner.getByRole("button", { name: "Try again" })).toHaveCount(0);
});

test("owner signs in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill("owner@abapro.health");
  await page.getByLabel(/^Password/).fill("abapro");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/personnel/);
});
