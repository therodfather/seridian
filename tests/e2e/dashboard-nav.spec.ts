import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo } from "./helpers";

test.describe("dashboard navigation", () => {
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
  });

  test("navigates to settings and chat", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Settings");
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await navigateTo(page, "Chat");
    await expect(page).toHaveURL(/\/dashboard\/chat/);
  });

  test("sign out returns to login", async ({ page }) => {
    await gotoDashboard(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("Sign in to continue")).toBeVisible();
  });
});
