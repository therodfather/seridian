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
