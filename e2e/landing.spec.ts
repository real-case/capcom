import { expect, test } from "@playwright/test";

/**
 * Public landing journey (ADR 0030/0031, PR-10). The landing is public and static — no
 * auth, no database — so this spec needs no seed: it loads `/en`, asserts the marketing
 * content (hero, a surface card, the visible seeded demo credentials), checks the JSON-LD
 * structured data is present, and follows the primary CTA into the sign-in route.
 */
test.describe("Public landing (ADR 0031)", () => {
  test("renders the landing, shows demo access, and links into the app", async ({
    page,
  }) => {
    await page.goto("/en");

    // Hero — the single h1 is the brand.
    await expect(
      page.getByRole("heading", { level: 1, name: "CAPCOM" }),
    ).toBeVisible();

    // The surface showcase describes the analytics surfaces.
    await expect(
      page.getByRole("heading", { name: "Retention cohorts" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ask with AI" }),
    ).toBeVisible();

    // The seeded demo credentials are surfaced so a visitor can sign straight in.
    await expect(page.getByText("alice@capcom.dev")).toBeVisible();
    await expect(page.getByText(/password password123/)).toBeVisible();

    // JSON-LD structured data is emitted (ADR 0031).
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    expect(await jsonLd.textContent()).toContain("SoftwareApplication");

    // The primary CTA deep-links into the app sign-in (locale-prefixed).
    const cta = page.getByRole("link", { name: "Try the live demo" });
    await expect(cta).toHaveAttribute("href", "/en/sign-in");
    await cta.click();
    await page.waitForURL(/\/en\/sign-in$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Sign in" }),
    ).toBeVisible();
  });
});
