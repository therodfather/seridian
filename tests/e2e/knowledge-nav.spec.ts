import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo } from "./helpers";

test.describe("knowledge navigation", () => {
  test("sidebar lists wiki, LLM arena, and second brain", async ({ page }) => {
    await gotoDashboard(page);
    const nav = page.locator("aside nav");
    await expect(nav.getByRole("link", { name: "Wiki" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "LLM Arena" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Second Brain" })).toBeVisible();
  });

  test("opens LLM Arena from the sidebar", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "LLM Arena");
    await expect(page).toHaveURL(/\/dashboard\/arena/);
    await expect(page.getByRole("heading", { name: "LLM Arena", level: 1 })).toBeVisible();
  });

  test("opens wiki from the sidebar", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Wiki");
    await expect(page).toHaveURL(/\/dashboard\/wiki/);
  });
});
