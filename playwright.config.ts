import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: CI ? "on-first-retry" : "off",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: CI ? "bun run start" : "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_CONVEX_URL:
        process.env.NEXT_PUBLIC_CONVEX_URL ||
        "https://fine-flamingo-162.convex.cloud",
    },
  },
});
