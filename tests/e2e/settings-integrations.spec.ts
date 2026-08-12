import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo } from "./helpers";

test.describe("settings integrations", { tag: "@smoke" }, () => {
  test("team tab and platform connections are usable", async ({ page }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Settings");
    await expect(page).toHaveURL(/\/dashboard\/settings/);

    await page.getByRole("button", { name: /Team & Access/i }).first().click();
    await expect(page).toHaveURL(/tab=users/);
    await expect(
      page.getByRole("button", { name: /Add User Access/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Integrations & Sync/i }).first().click();
    await expect(page).toHaveURL(/tab=sync/);
    await expect(page.getByText("Platform connections")).toBeVisible();
    await expect(page.getByRole("link", { name: /Open repository/i })).toHaveAttribute(
      "href",
      "https://github.com/therodfather/seridian",
    );
    await expect(page.getByRole("link", { name: /Open deploys/i })).toHaveAttribute(
      "href",
      "https://app.netlify.com/projects/seridian/deploys",
    );
    await expect(page.getByRole("button", { name: /Start setup|Manage setup/i })).toBeVisible();
    await expect(page.getByText(/Not configured/i).first()).toBeVisible();
    await expect(page.getByText("Linear sync (trial)")).toBeVisible();
    await expect(page.getByText(/^Live$/)).toHaveCount(0);
  });

  test("deep link opens integrations & sync tab", async ({ page }) => {
    await gotoDashboard(page);
    await page.goto("/dashboard/settings?tab=sync");
    await expect(page).toHaveURL(/tab=sync/);
    await expect(page.getByText("Platform connections")).toBeVisible();
  });
});
