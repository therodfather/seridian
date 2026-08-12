import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo } from "./helpers";

test.describe("dashboard chat", { tag: "@smoke" }, () => {
  test("requires login before chat loads", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await expect(page.getByText("Sign in to continue")).toBeVisible();
  });

  test("authenticated session shows channel sidebar", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Chat");
    await expect(page).toHaveURL(/\/dashboard\/chat/);
    await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
