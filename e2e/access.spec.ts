import { test, expect } from "@playwright/test";
import { mockAdminIdentity } from "./support/mock-admin-identity";

const ROLES_ONLY = ["ROLES.roles.VIEW", "ROLES.roles.EDIT"];

test.beforeEach(async ({ page }) => {
  await mockAdminIdentity(page, "abapro", { permissions: ROLES_ONLY });
});

test("shows only the menu items the current permissions allow", async ({ page }) => {
  await page.goto("/admin/roles");
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: "Roles" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Security policy" })).toHaveCount(0);
  await expect(nav.getByRole("button", { name: /Locations/ })).toHaveCount(0);
  await expect(nav.getByRole("button", { name: /User management/ })).toHaveCount(0);
});

test("blocks a page opened by URL without its permission", async ({ page }) => {
  await page.goto("/admin/settings/security");
  await expect(page.getByRole("heading", { name: "You're not authorized to view this page" })).toBeVisible();
  await page.getByRole("link", { name: "Go to your start page" }).click();
  await expect(page).toHaveURL(/\/admin\/roles$/);
});

test("explains a 403 from the API instead of offering Try again", async ({ page }) => {
  await page.route("**/api/admin-identity/roles**", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "This action is unauthorized.", status: 403 }),
    }),
  );
  await page.goto("/admin/roles");
  await expect(page.getByText("You're not authorized to see this content.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
});

test("lists an audit log once the backend allows it", async ({ page }) => {
  await page.goto("/admin/roles");
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: "Action log" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Login audit" })).toBeVisible();
});

test("hides and blocks an audit log the backend refuses", async ({ page }) => {
  await page.route("**/api/admin-identity/admin-action-logs**", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "This action is unauthorized.", status: 403 }),
    }),
  );
  await page.goto("/admin/audit/actions");
  await expect(page.getByRole("heading", { name: "You're not authorized to view this page" })).toBeVisible();
  const nav = page.getByRole("navigation").first();
  const group = nav.getByRole("button", { name: /RBAC & Audit Logs/ });
  if ((await group.getAttribute("aria-expanded")) !== "true") await group.click();
  await expect(nav.getByRole("link", { name: "Change log" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Action log" })).toHaveCount(0);
});
