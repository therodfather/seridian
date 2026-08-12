import { expect, test } from "@playwright/test";

test.describe("dashboard login", { tag: "@smoke" }, () => {
  test("shows password login form when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Sign in to continue")).toBeVisible();
    await expect(page.getByText("Username")).toBeVisible();
    await expect(page.getByText("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeDisabled();
  });

  test("enables submit after username and password are filled", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByPlaceholder("e.g. dee").fill("dee");
    await page.getByPlaceholder("Enter password").fill("secret");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });

  test("submitting credentials keeps the login form mounted", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByPlaceholder("e.g. dee").fill("not-a-user");
    await page.getByPlaceholder("Enter password").fill("wrong");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Sign in to continue")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in|signing in/i }),
    ).toBeVisible();
  });

  test("issues and chat require login", async ({ page }) => {
    await page.goto("/dashboard/issues");
    await expect(page.getByText("Sign in to continue")).toBeVisible();
    await page.goto("/dashboard/chat");
    await expect(page.getByText("Sign in to continue")).toBeVisible();
  });
});
