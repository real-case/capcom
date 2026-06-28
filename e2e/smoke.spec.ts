import { expect, test } from "@playwright/test";

// Smoke: the production build serves the home page end-to-end (ADR 0007).
//
// "Alive" is defined as three checks, template for every future e2e journey:
//   1. the route responds 200 — the server actually built and served the page;
//   2. server-rendered content is visible — the RSC payload is intact;
//   3. hydration settles with zero console errors and zero uncaught
//      exceptions — the cheapest signal that the client bundle and the
//      React Compiler output are not silently broken (React reports
//      hydration mismatches via console.error in production).
//
// No error allowlist on purpose: with retries: 0 (ADR 0049) any noise shows
// up immediately and must be fixed or excluded explicitly in review.
// The home route is now the public landing (PR-10) — landing.spec.ts asserts its
// content specifically; this stays the generic "renders + hydrates clean" alive-check
// (the zero-console-error contract now also guards the landing's JSON-LD + markup).
test("home page renders and hydrates cleanly", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Let hydration and late requests settle before judging the console.
  await page.waitForLoadState("networkidle");
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
