import { test as setup, expect } from "@playwright/test";
import { mockAdminIdentity } from "./support/mock-admin-identity";

const STATE = "e2e/.auth/state.json";

setup("authenticate as owner", async ({ page }) => {
  await mockAdminIdentity(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@abapro.health");
  await page.getByLabel("Password", { exact: true }).fill("abapro");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/personnel");
  await expect(page).toHaveURL(/\/personnel/);
  await page.context().storageState({ path: STATE });
});
