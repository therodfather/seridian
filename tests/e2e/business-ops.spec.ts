import { expect, test } from "@playwright/test";
import { gotoDashboard, navigateTo, openHubCard } from "./helpers";

test.describe("business ops dashboard", { tag: "@smoke" }, () => {
  test("business hub reaches clients, sales, proposals, contracts, files", async ({
    page,
  }) => {
    await gotoDashboard(page);

    await navigateTo(page, "Business");
    await expect(page).toHaveURL(/\/dashboard\/business/);
    await expect(page.getByRole("heading", { name: "Business", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /New engagement/i })).toBeVisible();

    await openHubCard(page, "Clients");
    await expect(page).toHaveURL(/\/dashboard\/clients/);
    await expect(page.getByRole("heading", { name: "Clients", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add Client/i }).first()).toBeVisible();

    await navigateTo(page, "Business");
    await openHubCard(page, "Sales");
    await expect(page).toHaveURL(/\/dashboard\/sales/);
    await expect(page.getByRole("heading", { name: "Sales Pipeline" })).toBeVisible();

    await navigateTo(page, "Business");
    await openHubCard(page, "Proposals");
    await expect(page).toHaveURL(/\/dashboard\/proposals/);
    await expect(page.getByRole("heading", { name: "Proposals", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /New Proposal/i }).first()).toBeVisible();

    await navigateTo(page, "Business");
    await openHubCard(page, "Contracts");
    await expect(page).toHaveURL(/\/dashboard\/contracts/);
    await expect(page.getByRole("heading", { name: "Contracts", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /New Contract/i }).first()).toBeVisible();

    await navigateTo(page, "Knowledge");
    await openHubCard(page, "Files");
    await expect(page).toHaveURL(/\/dashboard\/files/);
    await expect(page.getByRole("button", { name: /Create Document/i })).toBeVisible();
  });

  test("invalid client id shows not-found instead of crashing", async ({ page }) => {
    await gotoDashboard(page);
    await page.goto("/dashboard/clients/not-a-real-id");
    await expect(page.getByText(/Invalid client link|Client record not found/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: /Back to Clients/i })).toBeVisible();
  });
});
