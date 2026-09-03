import { test, expect } from "@playwright/test";
import { mockAdminIdentity } from "./support/mock-admin-identity";

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await mockAdminIdentity(page);
});

test("rejects invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@abapro.health");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Incorrect email or password")).toBeVisible();
});

test("owner signs in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@abapro.health");
  await page.getByLabel("Password", { exact: true }).fill("abapro");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/personnel/);
});
