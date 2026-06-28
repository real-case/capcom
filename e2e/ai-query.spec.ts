import { expect, test, type Page } from "@playwright/test";

/**
 * AI natural-language query browser journey (ADR 0091, PR-9).
 *
 * The first end-to-end UI flow beyond the smoke test: it signs in through the real
 * sign-in form (ADR 0016), opens the `/ask` surface (a Server Component resolved
 * under the member's RLS — ADR 0083), translates a prompt server-side via the
 * translation Server Action, and follows the resulting deep-link onto the existing
 * trends surface (ADR 0090). It is robust to whether `AI_API_KEY` is provisioned:
 * with no key the deterministic offline interpreter runs, with a key the model runs
 * — both map this prompt to a trends analysis, so the assertions hold either way
 * (the offline path itself is exercised exhaustively in unit tests).
 *
 * Requires the seed (a signed-in Aurora member + the Aurora Web project):
 *   npm run db:reset
 */

// Aurora Web project; bob is an Aurora viewer — membership is enough to read the
// project, so the RLS-404 page guard passes. (See supabase/seed.sql.)
const AURORA_WEB_PROJECT = "0a000000-0000-0000-0000-0000000000a1";
const EMAIL = "bob@capcom.dev";
const PASSWORD = "password123";

async function signInThroughUi(page: Page): Promise<void> {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // The form navigates to the workspace home on success (ADR 0016).
  await page.waitForURL(/\/en\/p(\/|$)/);
}

test.describe("AI query (ADR 0091)", () => {
  test("translates a prompt and deep-links to the matching surface", async ({
    page,
  }) => {
    await signInThroughUi(page);

    await page.goto(`/en/p/${AURORA_WEB_PROJECT}/ask`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Ask with AI" }),
    ).toBeVisible();

    await page
      .getByLabel("Your question")
      .fill("registrations by channel over 30 days");
    await page.getByRole("button", { name: "Ask" }).click();

    // The interpreted spec is surfaced as a trends analysis with an Open-analysis link.
    // Exact match: the prompt/example copy contains the kind words too.
    await expect(page.getByText("Trends", { exact: true })).toBeVisible();
    const open = page.getByRole("link", { name: /Open analysis/ });
    await expect(open).toBeVisible();
    await expect(open).toHaveAttribute(
      "href",
      new RegExp(`/p/${AURORA_WEB_PROJECT}/trends\\?`),
    );

    // Following the deep-link lands on the trends surface, hydrated from URL-state.
    await open.click();
    await page.waitForURL(
      new RegExp(`/en/p/${AURORA_WEB_PROJECT}/trends\\?.*event=sign_up`),
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("an example chip produces an interpreted analysis", async ({ page }) => {
    await signInThroughUi(page);
    await page.goto(`/en/p/${AURORA_WEB_PROJECT}/ask`);

    await page
      .getByRole("button", { name: "Weekly retention cohorts" })
      .click();

    await expect(page.getByText("Retention", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Open analysis/ }),
    ).toHaveAttribute(
      "href",
      new RegExp(`/p/${AURORA_WEB_PROJECT}/retention\\?`),
    );
  });
});
