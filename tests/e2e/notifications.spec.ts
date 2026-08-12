import { expect, test } from "@playwright/test";
import { gotoDashboard } from "./helpers";

test.describe("notification tray", { tag: "@smoke" }, () => {
  test("bell opens and closes the notifications panel", async ({ page }) => {
    await gotoDashboard(page);

    const bell = page.getByRole("button", { name: /^Notifications/ });
    await expect(bell).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Notifications panel" }),
    ).toHaveCount(0);

    await bell.click();
    const panel = page.getByRole("dialog", { name: "Notifications panel" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(panel.getByText("No notifications")).toBeVisible();

    // Panel is anchored above the footer control (not clipped below the viewport).
    const box = await panel.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);

    await page.getByRole("button", { name: "Close notifications" }).click();
    await expect(panel).toHaveCount(0);

    await bell.click();
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });
});
