import { test, expect } from "@playwright/test";

test("drills from a semantic action into its row-level changes", async ({ page }) => {
  await page.goto("/admin/audit/actions");
  await expect(page.getByText("Refund client order").first()).toBeVisible();

  await page.getByText("Refund client order").first().click();
  const viewChanges = page.getByRole("button", { name: "View database changes" });
  await expect(viewChanges).toBeVisible();
  await viewChanges.click();

  await expect(page).toHaveURL(/\/admin\/audit\/changes\?action=/);
});
