import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.P2_APP_URL || "http://localhost:3000"

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
    command: "npm run dev -- --hostname localhost --port 3000",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
