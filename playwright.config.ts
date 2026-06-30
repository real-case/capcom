import { defineConfig, devices } from "@playwright/test";

// Dedicated e2e port: a `next dev` session on 20000 must never be picked up
// by reuseExistingServer — e2e always targets the production build (ADR 0007).
const PORT = 20020;
const baseURL = `http://localhost:${PORT}`;

// ADR 0007: e2e runs against a production build. From Phase 7 on, the local
// Supabase stack must be up before `npm run test:e2e`.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // ADR 0049: no global retry policy — a flaky test is quarantined explicitly
  // (annotated skip + tracked issue), never papered over with retries.
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
