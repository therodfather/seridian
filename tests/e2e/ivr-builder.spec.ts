import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo } from "./helpers";

test.describe("IVR builder", { tag: "@smoke" }, () => {
  test("nav shows IVR / Voice and page has h1", async ({ page }) => {
    await gotoDashboard(page);
    const nav = page.locator("aside nav");
    await expect(nav.getByRole("link", { name: "IVR / Voice" })).toBeVisible();
    await navigateTo(page, "IVR / Voice");
    await expect(page).toHaveURL(/\/dashboard\/ivr/);
    await expect(page.getByRole("heading", { name: "IVR / Voice", level: 1 })).toBeVisible();
  });
});
