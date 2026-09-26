import { defineConfig, devices } from "@playwright/test";

// Set BASE_URL to run the suite against a deployed site (preview or production) instead of a local server.
const remote = process.env.BASE_URL;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: remote || "http://localhost:4173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "iphone", use: { ...devices["iPhone 14"] } }, // WebKit: what iPhone Safari actually runs
  ],
  webServer: remote
    ? undefined
    : {
        command: "npx serve -l 4173 .",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
      },
});
