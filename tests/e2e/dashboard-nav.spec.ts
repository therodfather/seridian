import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo, openHubCard } from "./helpers";

test.describe("dashboard navigation", { tag: "@smoke" }, () => {
  test("sidebar lists calm primary hubs only", async ({ page }) => {
    await gotoDashboard(page);
    const nav = page.locator("aside nav");
    for (const label of [
      "Overview",
      "Work",
      "Business",
      "Knowledge",
      "Voice",
      "Settings",
    ]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    // Nested laundry-list items must not appear in the primary sidebar
    for (const label of [
      "Clients",
      "Bookings",
      "Sales",
      "Proposals",
      "Contracts",
      "Health Check",
      "Files",
      "Chat",
      "Wiki",
      "LLM Arena",
      "Second Brain",
      "Templates",
      "Sync",
    ]) {
      await expect(nav.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("navigates to settings and chat via knowledge hub", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Settings");
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await navigateTo(page, "Knowledge");
    await expect(page).toHaveURL(/\/dashboard\/knowledge/);
    await openHubCard(page, "Chat");
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
