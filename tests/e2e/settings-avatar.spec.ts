import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo } from "./helpers";

test.describe("settings avatars", () => {
  test("team tab shows member access and avatar controls when users exist", async ({
    page,
  }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Settings");
    await expect(page).toHaveURL(/\/dashboard\/settings/);

    await page.getByRole("button", { name: /Team & Access/i }).click();
    await expect(page.getByRole("button", { name: /Add User Access/i })).toBeVisible();

    const upload = page.getByRole("button", { name: /upload avatar/i });
    const empty = page.getByText(/No organization members/i);
    await expect(upload.or(empty).first()).toBeVisible({ timeout: 15_000 });
  });
});
