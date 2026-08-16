import { type Page } from "@playwright/test";

/** Dashboard auth is localStorage-based (`seridian_user` JSON). */
export async function loginViaStorage(
  page: Page,
  name = "Admin",
  pubkey = "admin",
) {
  await page.addInitScript(
    ({ name, pubkey }) => {
      localStorage.setItem("seridian_user", JSON.stringify({ pubkey, name }));
    },
    { name, pubkey },
  );
}

export async function gotoDashboard(page: Page) {
  await loginViaStorage(page);
  await page.goto("/dashboard");
  await page.waitForSelector("aside nav", { timeout: 15_000 });
}

export async function navigateTo(page: Page, section: string) {
  const link = page.locator(`aside nav a:has-text("${section}")`);
  await link.click();
  await page.waitForLoadState("domcontentloaded");
}

/** Click a hub card by its title (Business / Knowledge hubs). */
export async function openHubCard(page: Page, title: string) {
  await page.locator("main").getByRole("link", { name: title }).first().click();
  await page.waitForLoadState("domcontentloaded");
}
