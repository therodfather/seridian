import { expect, test } from "@playwright/test";

test.describe("marketing site", { tag: "@smoke" }, () => {
  test("homepage renders hero and primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /build and scale with/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Cloud Infrastructure & Application Development", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("contact section is reachable", async ({ page }) => {
    await page.goto("/");
    const contact = page.locator("#contact");
    await contact.scrollIntoViewIfNeeded();
    await expect(contact).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /talk about your next project/i }),
    ).toBeVisible();
  });

  test("packages page opens from header nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Packages" }).click();
    await expect(page).toHaveURL(/\/packages$/);
    await expect(
      page.getByRole("heading", { name: /Clear scope/i }),
    ).toBeVisible();
  });
});
