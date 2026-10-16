import { test, expect } from "@playwright/test";
import { mockAdminIdentity } from "./support/mock-admin-identity";
import { DUBAI_CODES, mockLocations } from "./support/mock-locations";

test.beforeEach(async ({ page }) => {
  await mockAdminIdentity(page);
});

test("opens a country's regions from the countries list", async ({ page }) => {
  await mockLocations(page);
  await page.goto("/admin/locations/countries");
  await page.getByRole("link", { name: "View regions: United Arab Emirates" }).click();
  await expect(page).toHaveURL(/\/admin\/locations\/regions\?country=1$/);
  await expect(page.getByRole("link", { name: "Open in the region builder: Dubai" })).toBeVisible();
});

test("shows the backend error when a country code is taken, then creates the country", async ({ page }) => {
  await mockLocations(page);
  await page.goto("/admin/locations/countries");
  await page.getByRole("button", { name: "New country" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Code/).fill("ae");
  await dialog.getByLabel(/^Name \(English\)/).fill("Emirates again");
  await dialog.getByRole("button", { name: "Create country" }).click();
  await expect(page.getByText("The code has already been taken.")).toBeVisible();

  await dialog.getByLabel(/^Code/).fill("sa");
  await dialog.getByLabel(/^Name \(English\)/).fill("Saudi Arabia");
  await dialog.getByRole("button", { name: "Create country" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name: "View regions: Saudi Arabia" })).toBeVisible();
});

test("creates a region and lands in the region builder", async ({ page }) => {
  await mockLocations(page);
  await page.goto("/admin/locations/regions?country=1");
  await page.getByRole("button", { name: "New region" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Name \(English\)/).fill("Hatta");
  await dialog.getByRole("button", { name: "Create region" }).click();
  await expect(page).toHaveURL(/\/admin\/locations\/builder\?region=\d+$/);
  await expect(page.getByRole("button", { name: "Switch region: Hatta" })).toBeVisible();
});

test("paints cells with a rectangle and saves them with the centre", async ({ page }) => {
  const { coverageSaves } = await mockLocations(page);
  await page.goto("/admin/locations/builder?region=10");
  const cells = page.getByRole("region", { name: "Cells" });
  await expect(cells.getByText(`${DUBAI_CODES.length} cells`)).toBeVisible();

  await page.getByRole("switch", { name: "Take every cell the shape touches" }).click();
  await page.getByRole("button", { name: "Rectangle" }).first().click();
  const canvas = page.locator(".maplibregl-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("map canvas is not visible");
  await page.keyboard.down("Shift");
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect(page.getByText("Unsaved changes").first()).toBeVisible();

  await cells.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => coverageSaves.length).toBe(1);
  const [saved] = coverageSaves;
  expect(saved.cityId).toBe(10);
  expect(saved.body.points.length).toBeGreaterThan(DUBAI_CODES.length);
  expect("mgrs" in saved.body.points[0] ? saved.body.points[0].mgrs : "").toMatch(/^\d{1,2}[A-Z] [A-Z]{2} \d{5} \d{5}$/);
  expect(saved.body.center.lat).toBeGreaterThan(24);
  await expect(page.getByText("Unsaved changes")).toHaveCount(0);
});

test("asks before leaving the builder with unsaved changes", async ({ page }) => {
  await mockLocations(page);
  await page.goto("/admin/locations/builder?region=10");
  const cells = page.getByRole("region", { name: "Cells" });
  await expect(cells.getByText(`${DUBAI_CODES.length} cells`)).toBeVisible();
  await cells.getByRole("button", { name: "Drop every cell" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Drop every cell" }).click();
  await expect(cells.getByText("0 cells")).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Countries" }).click();
  const leave = page.getByRole("alertdialog");
  await expect(leave.getByText("Leave without saving?")).toBeVisible();
  await leave.getByRole("button", { name: "Stay" }).click();
  await expect(page).toHaveURL(/\/admin\/locations\/builder\?region=10$/);
});
