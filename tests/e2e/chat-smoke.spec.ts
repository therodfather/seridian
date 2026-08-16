import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo, openHubCard } from "./helpers";

test.describe("dashboard chat", { tag: "@smoke" }, () => {
  test("requires login before chat loads", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await expect(page.getByText("Sign in to continue")).toBeVisible();
  });

  test("authenticated session shows channel sidebar", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Knowledge");
    await openHubCard(page, "Chat");
    await expect(page).toHaveURL(/\/dashboard\/chat/);
    await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("chat fills viewport above the status bar", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Knowledge");
    await openHubCard(page, "Chat");
    await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible({
      timeout: 15_000,
    });

    const composer = page.getByTestId("chat-composer");
    await expect(composer).toBeVisible();

    const gap = await page.evaluate(() => {
      const composerEl = document.querySelector('[data-testid="chat-composer"]');
      const footer = document.querySelector("footer[role='contentinfo']");
      if (!composerEl || !footer) return null;
      return footer.getBoundingClientRect().top - composerEl.getBoundingClientRect().bottom;
    });

    expect(gap).not.toBeNull();
    // Composer should pin flush above the status bar (allow a couple px of subpixel gap).
    expect(gap!).toBeGreaterThanOrEqual(-1);
    expect(gap!).toBeLessThan(8);
  });
});
