import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.P6_APP_URL || "http://127.0.0.1:3102"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3102",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
