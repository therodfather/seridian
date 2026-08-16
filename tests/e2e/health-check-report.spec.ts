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

    // The report is now a guided multi-step flow (Client -> Findings -> 30/60/90 -> Print)
    // that can't be skipped ahead in — the remediation plan only renders once you reach the
    // "Print" step (which shows every section at once, since that's the one you'd print).
    const next = page.getByRole("button", { name: "Next", exact: true });
    await next.click();
    await next.click();
    await next.click();
    await expect(
      page.getByRole("heading", { name: /30 \/ 60 \/ 90-day remediation plan/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Print report" })).toBeVisible();
  });
});
