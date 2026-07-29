import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
      },
    },
    {
      name: "narrow-mobile-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 320, height: 568 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "mobile-landscape-chromium",
      use: {
        ...devices["iPhone 13 landscape"],
        browserName: "chromium",
      },
    },
  ],
  webServer: {
    command:
      "VITE_USE_FIREBASE_EMULATORS=true VITE_ACCESS_REQUEST_URL=https://example.test/request-access VITE_FIREBASE_APP_CHECK_DEBUG=true npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173/sign-in",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
