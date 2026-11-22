import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3106",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "**/i02-dev.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-dev",
      testMatch: "**/i02-dev.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3107" },
    },
  ],
  webServer: [
    {
      command: "npm run preview -- --port 3106",
      url: "http://127.0.0.1:3106",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 3107",
      url: "http://127.0.0.1:3107",
      env: { I02_OPENAI_API_KEY: "" },
      reuseExistingServer: false,
    },
  ],
});
