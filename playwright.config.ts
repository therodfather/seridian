import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;
const baseURL = process.env.BASE_URL || "http://localhost:3000";
/** When BASE_URL points at a deployed site, skip starting a local server (no secrets needed). */
const isRemoteBase =
  !!process.env.BASE_URL &&
  !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(baseURL);

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
    baseURL,
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

  ...(isRemoteBase
    ? {}
    : {
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
      }),
});
