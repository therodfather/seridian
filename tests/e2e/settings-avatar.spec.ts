import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo } from "./helpers";

test.describe("settings avatars", () => {
  test("team tab opens member access controls", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Settings");
    await expect(page).toHaveURL(/\/dashboard\/settings/);

    await page.getByRole("button", { name: /Team & Access/i }).first().click();
    await expect(page).toHaveURL(/tab=users/);
    await expect(
      page.getByRole("button", { name: /Add User Access/i }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Search members by name or handle..."),
    ).toBeVisible();
  });
});
