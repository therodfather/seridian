import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo, openHubCard } from "./helpers";

test.describe("health check report", { tag: "@smoke" }, () => {
  test("opens the one-page report template from the business hub", async ({
    page,
  }) => {
    await gotoDashboard(page);
    await navigateTo(page, "Business");
    await openHubCard(page, "Health Check");
    await expect(page).toHaveURL(/\/dashboard\/health-check/);
    await expect(
      page.getByRole("heading", { name: "Health Check", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Cloud & Infrastructure Health Check",
        level: 2,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Cloud & Infrastructure Health Check — $999 prepaid"),
    ).toBeVisible();
    await expect(
      page.getByText("written report (Critical / High / Recommended / Doing well) + 30/60/90 plan"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /30 \/ 60 \/ 90-day remediation plan/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Print report" })).toBeVisible();
  });
});
