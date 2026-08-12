import { expect, test } from "@playwright/test";
import { gotoDashboard } from "./helpers";

test.describe("LLM Arena model manager", () => {
  test("lists ONNX-compatible models", async ({ page }) => {
    await gotoDashboard(page);
    await page.goto("/dashboard/arena");
    await expect(page.getByRole("heading", { name: "LLM Arena", level: 1 })).toBeVisible();
    await expect(page.getByText("Model Manager")).toBeVisible();
    await expect(page.getByText("MiniCPM5 1B").first()).toBeVisible();
    await expect(page.getByText("Qwen3 0.6B").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Download" }).first()).toBeVisible();
    await expect(page.getByText("Download a model in the Model Manager")).toBeVisible();
  });

  test("arena fills viewport above the status bar", async ({ page }) => {
    await gotoDashboard(page);
    await page.goto("/dashboard/arena");
    await expect(page.getByRole("heading", { name: "LLM Arena", level: 1 })).toBeVisible();

    const composer = page.getByTestId("arena-composer");
    await expect(composer).toBeVisible();

    const metrics = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="arena-root"]');
      const composerEl = document.querySelector('[data-testid="arena-composer"]');
      const footer = document.querySelector("footer[role='contentinfo']");
      const main = document.querySelector("#main-content");
      if (!root || !composerEl || !footer || !main) return null;
      const rootRect = root.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      return {
        gap: footer.getBoundingClientRect().top - composerEl.getBoundingClientRect().bottom,
        rootHeight: rootRect.height,
        mainHeight: mainRect.height,
      };
    });

    expect(metrics).not.toBeNull();
    // Composer should pin flush above the status bar (allow a couple px of subpixel gap).
    expect(metrics!.gap).toBeGreaterThanOrEqual(-1);
    expect(metrics!.gap).toBeLessThan(8);
    // Comparison pane should consume the main column, not a nested calc-height card.
    expect(metrics!.rootHeight).toBeGreaterThan(metrics!.mainHeight * 0.6);
  });
});
