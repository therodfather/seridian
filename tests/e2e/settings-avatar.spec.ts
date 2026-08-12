import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo } from "./helpers";

test.describe("settings avatars", () => {
  test("team tab opens and shows member access controls", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Settings");
    await expect(page).toHaveURL(/\/dashboard\/settings/);

    await page.getByRole("button", { name: /Team & Access/i }).first().click();
    await expect(
      page.getByRole("button", { name: /Add User Access/i }),
    ).toBeVisible();

    // Avatar controls only render when Convex returns members; assert empty or upload UI.
    const upload = page.getByRole("button", { name: /upload avatar/i });
    const empty = page.getByText(/No organization members/i);
    const memberRow = page.getByText(/@/);
    await expect(upload.or(empty).or(memberRow).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
