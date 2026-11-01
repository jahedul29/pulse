import { test, expect } from "@playwright/test";
import { mockAdminIdentity } from "./support/mock-admin-identity";

test.beforeEach(async ({ page }) => {
  await mockAdminIdentity(page);
});

test("invites an admin and the pending row appears without a refresh", async ({ page }) => {
  await page.goto("/admin/user-management");
  await expect(page.getByText("Dana Okonkwo").first()).toBeVisible();

  await page.getByRole("button", { name: "Invite user" }).click();
  const dialog = page.getByRole("dialog", { name: "Invite user" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Select a staff member" }).click();
  await page.getByPlaceholder("Search staff").fill("Bruno");
  await page.getByRole("button", { name: /Bruno Costa/ }).click();

  await expect(dialog.getByRole("textbox", { name: "Email" })).toHaveValue("bruno.costa@abapro.health");

  await dialog.getByRole("button", { name: "Select one or more roles" }).click();
  await page.locator('[data-slot="popover-content"]').getByText("Admin", { exact: true }).click();
  await page.keyboard.press("Escape");

  await dialog.getByRole("button", { name: "Send invite" }).click();

  await expect(dialog).toBeHidden();
  const row = page.getByRole("link", { name: "Bruno Costa" });
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
  const row = page.getByRole("link", { name: "Nadia Kaur" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Suspend" }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.getByLabel("Reason").fill("Leave of absence");
  await confirm.getByRole("button", { name: "Suspend" }).click();

  await expect(row.getByText("Suspended")).toBeVisible();
});

test("rolls back an optimistic status change when the API fails", async ({ page }) => {
  await page.goto("/admin/user-management");
  const row = page.getByRole("link", { name: "Noah Weiss" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Suspend" }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.getByRole("button", { name: "Suspend" }).click();

  await expect(page.getByText("Couldn't apply the change. Reverted.")).toBeVisible();
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toBeHidden();
  await expect(row.getByText("Active")).toBeVisible();
});

test("keeps a revoked invitation in the Revoked tab and invites the person again", async ({ page }) => {
  await page.goto("/admin/user-management");
  await expect(page.getByText("Dana Okonkwo").first()).toBeVisible();

  await page.getByRole("button", { name: "Invite user" }).click();
  const invite = page.getByRole("dialog", { name: "Invite user" });
  await invite.getByRole("button", { name: "Select a staff member" }).click();
  await page.getByPlaceholder("Search staff").fill("Bruno");
  await page.getByRole("button", { name: /Bruno Costa/ }).click();
  await invite.getByRole("button", { name: "Send invite" }).click();
  await expect(invite).toBeHidden();

  await page.getByRole("tab", { name: /Pending invitations/ }).click();
  const pendingRow = page.getByRole("tabpanel", { name: /Pending invitations/ }).getByRole("link", { name: "Bruno Costa" });
  await pendingRow.getByRole("button", { name: "Revoke invite" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Revoke invite" }).click();

  await page.getByRole("tab", { name: /Revoked invitations/ }).click();
  const revokedRow = page.getByRole("tabpanel", { name: /Revoked invitations/ }).getByRole("link", { name: "Bruno Costa" });
  await expect(revokedRow).toBeVisible();

  await revokedRow.getByRole("button", { name: "Invite again" }).click();
  const again = page.getByRole("alertdialog", { name: "Invite Bruno Costa again?" });
  await expect(again.getByText("A new invitation will be sent to bruno.costa@abapro.health.")).toBeVisible();
  await again.getByRole("button", { name: "Invite again" }).click();
  await expect(again).toBeHidden();
  await expect(revokedRow.getByRole("button", { name: "Invite again" })).toHaveAttribute("aria-disabled", "true");

  await page.getByRole("tab", { name: /Pending invitations/ }).click();
  await expect(
    page.getByRole("tabpanel", { name: /Pending invitations/ }).getByRole("link", { name: "Bruno Costa" }),
  ).toBeVisible();
});

