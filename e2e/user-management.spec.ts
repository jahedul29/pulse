import { test, expect } from "@playwright/test";

test("invites an admin and the pending row appears without a refresh", async ({ page }) => {
  await page.goto("/admin/user-management");
  await expect(page.getByText("Dana Okonkwo").first()).toBeVisible();

  await page.getByRole("button", { name: "Invite admin" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Select a staff member" }).click();
  await page.getByPlaceholder("Search staff").fill("Bruno");
  await page.getByRole("button", { name: /Bruno Costa/ }).click();

  await expect(dialog.getByRole("textbox", { name: "Email" })).toHaveValue("bruno.costa@abapro.health");

  await dialog.getByRole("button", { name: "Select one or more roles" }).click();
  const rolesPopover = page.locator('[data-slot="popover-content"]');
  await rolesPopover.getByText("Admin", { exact: true }).click();
  await dialog.getByRole("heading", { name: "Invite admin" }).click();

  await dialog.getByRole("button", { name: "Send invite" }).click();

  await expect(dialog).toBeHidden();
  const row = page.getByRole("row", { name: /Bruno Costa/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("Pending")).toBeVisible();
});

test("opens the read-only detail drawer from a row click", async ({ page }) => {
  await page.goto("/admin/user-management");
  await page.getByText("Dana Okonkwo").first().click();

  await expect(page.getByText("Timeline")).toBeVisible();
  await expect(page.getByText("Invited by")).toBeVisible();
});

test("suspends an active account with an optimistic status change", async ({ page }) => {
  await page.goto("/admin/user-management");
  const row = page.getByRole("row", { name: /Nadia Kaur/ });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Account actions" }).click();
  await page.getByRole("menuitem", { name: "Suspend" }).click();

  await expect(row.getByText("Suspended")).toBeVisible();
});

test("rolls back an optimistic status change when the API fails", async ({ page }) => {
  await page.goto("/admin/user-management");
  await page.getByPlaceholder("Search by name or email").fill("Noah");
  const row = page.getByRole("row", { name: /Noah Weiss/ });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Account actions" }).click();
  await page.getByRole("menuitem", { name: "Suspend" }).click();

  await expect(page.getByText("Couldn't apply the change. Reverted.")).toBeVisible();
  await expect(row.getByText("Active")).toBeVisible();
});
