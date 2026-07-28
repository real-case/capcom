import { expect, test, type Page } from "@playwright/test";

/**
 * App shell & navigation IA browser journey (PR-13).
 *
 * Signs in through the real form (ADR 0016), then exercises the project shell that
 * frames every analysis surface: the overview hub links into each surface, the sidebar
 * navigates and reflects the active section, and the ⌘K command palette jumps to a
 * section. Assertions are scoped to the shell landmarks (`Primary navigation`,
 * `Breadcrumb`, `main`) because the sidebar lists the same section names the hub does.
 *
 * Requires the seed (a signed-in Aurora member + the Aurora Web project):
 *   npm run db:reset
 */

// Aurora Web project; bob is an Aurora viewer — membership is enough to read the
// project, so the RLS-404 shell guard passes. (See supabase/seed.sql.)
const AURORA_WEB_PROJECT = "0a000000-0000-0000-0000-0000000000a1";
const EMAIL = "bob@capcom.dev";
const PASSWORD = "password123";

async function signInThroughUi(page: Page): Promise<void> {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/p(\/|$)/);
}

test.describe("App shell & navigation (PR-13)", () => {
  test.beforeEach(async ({ page }) => {
    await signInThroughUi(page);
    await page.goto(`/en/p/${AURORA_WEB_PROJECT}`);
  });

  test("the overview hub links into the analysis surfaces", async ({
    page,
  }) => {
    const main = page.getByRole("main");

    // A card per surface (overview is the current page, so it has none).
    await expect(main.getByRole("link", { name: /Trends/ })).toHaveAttribute(
      "href",
      new RegExp(`/p/${AURORA_WEB_PROJECT}/trends$`),
    );
    await expect(main.getByRole("link", { name: /Overview/ })).toHaveCount(0);

    // The sidebar is present with the same sections.
    await expect(
      page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: "Trends" }),
    ).toBeVisible();
  });

  test("the sidebar navigates and marks the active section", async ({
    page,
  }) => {
    const sidebar = page.getByRole("navigation", {
      name: "Primary navigation",
    });
    await sidebar.getByRole("link", { name: "Retention" }).click();

    await page.waitForURL(new RegExp(`/en/p/${AURORA_WEB_PROJECT}/retention`));
    await expect(
      page.getByRole("navigation", { name: "Breadcrumb" }),
    ).toContainText("Retention");
    await expect(
      sidebar.getByRole("link", { name: "Retention" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("the ⌘K palette jumps to a section", async ({ page }) => {
    // Keyboard shortcut opens it (ControlOrMeta maps per platform; the shell binds both).
    // The binding is attached in an effect (`AppShell`), so a press that lands before the
    // shell hydrates is silently dropped — and a lost keypress never retries itself, which
    // made this assertion race page-load timing rather than test the shortcut. Poll the
    // press until the palette opens, instead of a fixed wait. The handler TOGGLES, so the
    // press is guarded on the dialog being closed: a blind retry could shut it again.
    const dialog = page.getByRole("dialog");
    await expect(async () => {
      if (!(await dialog.isVisible())) {
        await page.keyboard.press("ControlOrMeta+k");
      }
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });

    await dialog.getByPlaceholder("Type a command").fill("funnels");
    await dialog.getByRole("option", { name: /Funnels/ }).click();

    await page.waitForURL(new RegExp(`/en/p/${AURORA_WEB_PROJECT}/funnels`));
  });
});
