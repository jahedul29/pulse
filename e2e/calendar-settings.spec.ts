import { test, expect, type Page } from "@playwright/test";
import { mockAdminIdentity } from "./support/mock-admin-identity";

test.beforeEach(async ({ page }) => {
  await mockAdminIdentity(page);
});

async function closeCoach(page: Page) {
  const gotIt = page.getByRole("button", { name: "Got it" });
  if (await gotIt.isVisible()) await gotIt.click();
}

test("applies a role default that the calendar then enforces", async ({ page }) => {
  await page.goto("/calendar-settings");
  await page.getByRole("tab", { name: "Analyst" }).click();
  await page.getByLabel(/^Maximum weekly days off/).first().fill("1");
  await page.getByRole("button", { name: "Apply parameters" }).click();
  await expect(page.getByText("Calendar parameters applied in this browser")).toBeVisible();

  await page.goto("/demo/analyst");
  await closeCoach(page);
  await page.getByRole("button", { name: /^Mon/ }).first().click();
  await page.getByRole("button", { name: /^Tue/ }).first().click();
  await expect(page.getByText("Maximum 1 day off allowed")).toBeVisible();
});

test("saves a specialist override and opens the rule switches from the calendar", async ({ page }) => {
  await page.goto("/calendar-settings?specialist=sp-1");
  await expect(page.getByRole("tab", { name: "Specialist values" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("switch", { name: "Override Maximum annual days off" }).click();
  await page.getByLabel(/^Maximum annual days off$/).fill("40");
  await page.getByRole("button", { name: "Save specialist values" }).click();
  await expect(page.getByText("Specialist parameter values saved")).toBeVisible();

  await page.goto("/personnel/sp-1");
  await closeCoach(page);
  await page.getByRole("button", { name: /^Calendar rule switches/ }).click();
  await expect(page.getByRole("dialog", { name: /Calendar rule switches/ })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Enforce Maximum weekly days off" })).toBeChecked();
});
