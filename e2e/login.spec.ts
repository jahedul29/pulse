import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("rejects invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@abapro.health");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Incorrect email or password")).toBeVisible();
});

test("owner signs in without MFA", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@abapro.health");
  await page.getByLabel("Password", { exact: true }).fill("abapro");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/personnel/);
});

test("admin login requires two-step verification", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@abapro.health");
  await page.getByLabel("Password", { exact: true }).fill("abapro");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Two-step verification")).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
