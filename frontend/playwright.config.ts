import { defineConfig } from "@playwright/test"

const baseURL = process.env.P4_API_URL

if (!baseURL) {
  throw new Error("Definí P4_API_URL para ejecutar pruebas contra una base de datos exclusiva de pruebas.")
}

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
  },
})
