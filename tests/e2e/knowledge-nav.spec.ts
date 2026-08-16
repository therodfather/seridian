import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo, openHubCard } from "./helpers";

test.describe("knowledge navigation", () => {
  test("knowledge hub lists wiki, LLM arena, and second brain", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Knowledge");
    await expect(page).toHaveURL(/\/dashboard\/knowledge/);
    const hub = page.locator("main");
    await expect(hub.getByRole("link", { name: /Wiki/i })).toBeVisible();
    await expect(hub.getByRole("link", { name: /LLM Arena/i })).toBeVisible();
    await expect(hub.getByRole("link", { name: /Second Brain/i })).toBeVisible();
  });

  test("opens LLM Arena from the knowledge hub", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Knowledge");
    await openHubCard(page, "LLM Arena");
    await expect(page).toHaveURL(/\/dashboard\/arena/);
    await expect(page.getByRole("heading", { name: "LLM Arena", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Model Manager", exact: true })).toBeVisible();
  });

  test("opens wiki from the knowledge hub", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Knowledge");
    await openHubCard(page, "Wiki");
    await expect(page).toHaveURL(/\/dashboard\/wiki/);
    await expect(page.getByRole("heading", { name: "Wiki", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Load company knowledge/i })).toBeVisible();
  });

  test("opens second brain from the knowledge hub", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Knowledge");
    await openHubCard(page, "Second Brain");
    await expect(page).toHaveURL(/\/dashboard\/brain/);
    await expect(page.getByRole("heading", { name: "Second Brain", level: 1 })).toBeVisible();
  });
});
