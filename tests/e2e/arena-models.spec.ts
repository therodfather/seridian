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
      const composerRect = composerEl.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      return {
        gap: footer.getBoundingClientRect().top - composerRect.bottom,
        rootHeight: rootRect.height,
        mainHeight: mainRect.height,
        composerFromRootBottom: rootRect.bottom - composerRect.bottom,
        composerInBottomHalf: composerRect.top > rootRect.top + rootRect.height * 0.5,
        overlayCount: document.querySelectorAll(
          '[data-testid="arena-root"] .absolute.inset-0.z-10',
        ).length,
      };
    });

    expect(metrics).not.toBeNull();
    // Composer should pin flush above the status bar (allow a couple px of subpixel gap).
    expect(metrics!.gap).toBeGreaterThanOrEqual(-1);
    expect(metrics!.gap).toBeLessThan(8);
    // Comparison pane should consume the main column, not a nested calc-height card.
    expect(metrics!.rootHeight).toBeGreaterThan(metrics!.mainHeight * 0.6);
    // Composer sits at the bottom of the arena column, not vertically centered.
    expect(metrics!.composerFromRootBottom).toBeGreaterThanOrEqual(-1);
    expect(metrics!.composerFromRootBottom).toBeLessThan(8);
    expect(metrics!.composerInBottomHalf).toBe(true);
    expect(metrics!.overlayCount).toBe(0);
    await expect(page.getByTestId("arena-error-banner")).toHaveCount(0);
  });
});
