import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo } from "./helpers";

test.describe("dashboard navigation", { tag: "@smoke" }, () => {
  test("sidebar lists core business sections", async ({ page }) => {
    await gotoDashboard(page);
    const nav = page.locator("aside nav");
    for (const label of [
      "Overview",
      "Issues",
      "Clients",
      "Bookings",
      "Sales",
      "Proposals",
      "Files",
      "Chat",
      "Settings",
    ]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Sync" })).toHaveCount(0);
  });

  test("navigates to settings and chat", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Settings");
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await navigateTo(page, "Chat");
    await expect(page).toHaveURL(/\/dashboard\/chat/);
  });

  test("legacy sync path redirects into settings integrations tab", async ({
    page,
  }) => {
    await gotoDashboard(page);
    await page.goto("/dashboard/sync");
    await expect(page).toHaveURL(/\/dashboard\/settings\?tab=sync/);
    await expect(
      page.getByRole("button", { name: /Integrations & Sync/i }).first(),
    ).toBeVisible();
  });

  test("sign out returns to login", async ({ page }) => {
    await gotoDashboard(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("Sign in to continue")).toBeVisible();
  });
});
