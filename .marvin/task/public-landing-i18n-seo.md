---
slug: public-landing-i18n-seo
type: feature
status: shipped
created: 2026-06-29
tracker: none
supersedes: none
stack: typescript, shell
risk: medium
breaking: false
spike_required: false
test_command: npm run test
contract_sha: 8b0f2e8b1a50e5c0
---

# Public landing + i18n/SEO polish + README case study + CI safety-net re-enable (PR-10)

## Goal

Replace the placeholder home with a real public marketing landing (lead-gen front door), enrich
i18n/SEO (richer Metadata + static OG image + JSON-LD), write the README "behind the scenes" case
study, and re-arm the CI safety net (author the DEV-001 e2e + migration-replay job and the DEV-002
Storybook smoke job, then resolve both deviations) — the last roadmap unit before the first
`dev → main` promotion.

## Context

- Related patterns: the landing follows the established FSD widget-slice shape
  (`src/widgets/trends-explorer/index.ts` → `ui/` segments) so the token gate (eslint + `check:tokens`,
  scoped to `src/components/** + src/widgets/**`) actually covers the markup — `src/app/**` is NOT
  token-gated. The page stays a thin RSC: `src/app/[locale]/page.tsx:12` is already coverage-excluded
  (`vitest.config.mts:100`). Metadata rides `src/app/[locale]/layout.tsx:33` (`generateMetadata`) +
  `src/i18n/metadata.ts` (`buildAlternates`) + the `metadataBase` from `env.NEXT_PUBLIC_SITE_URL`
  (`src/lib/env.ts:22`). i18n copy is authored in `messages/en.json` and read via `getTranslations`.
  Tests/stories wrap intl-using components in `NextIntlClientProvider locale="en" messages={en.json}`
  (`src/widgets/trends-explorer/ui/TrendsExplorer.test.tsx:20`). The CI gate is `.github/workflows/ci.yml`;
  the e2e harness is `playwright.config.ts` (webServer runs `next build && next start`); the seed
  generator `scripts/seed-events.mjs` auto-detects the local service key from `supabase status` and
  pins `SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z`.
- Callers / reverse-deps: the `HomePage` i18n namespace (`messages/en.json:6`) is referenced ONLY by
  `src/app/[locale]/page.tsx` (the `(app)/p/page.tsx` match is the function name `WorkspaceHomePage`,
  not the namespace) — so it can be repurposed into a richer `Landing` namespace with no other caller
  to update. `sitemap.ts`/`robots.ts` already emit `/` per locale and need no change. No code imports
  the landing widget except the home route.
- Constraints: token-only UI (ADR 0058); FSD downward-only, no widget→widget import, public `index.ts`
  only (ADR 0065/0066); all copy through next-intl (ADR 0030/0055); coverage ≥80% (ADR 0008); GitHub
  Actions `uses:` SHA-pinned (ADR 0044/0070); Conventional Commits (ADR 0072); no version bump / no
  CHANGELOG in this PR (the release ritual is a separate human step, ADR 0080/0046).
- Sibling specs: `.marvin/task/trends-explorer.md`, `tenancy-foundation.md`,
  `mission-control-design-token-foundation.md` (all shipped). None depended on.

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: src/app/[locale]/page.tsx
    action: edit
    intent: home RSC becomes the landing container — setRequestLocale, getTranslations("Landing"), assemble the typed copy object, render <LandingPage>, inject the JSON-LD <script>, and export generateMetadata (landing description + OG image + canonical/hreflang via buildAlternates)
    satisfies: [AC1, AC3]
    anchor: src/app/[locale]/page.tsx:12
  - id: F2
    path: src/app/[locale]/layout.tsx
    action: edit
    intent: add the static OG/Twitter image (public/og.png, resolved against metadataBase) to the shared social-card defaults so every route inherits a card
    satisfies: [AC3]
    anchor: src/app/[locale]/layout.tsx:54
  - id: F3
    path: messages/en.json
    action: edit
    intent: replace the HomePage namespace with a richer Landing namespace (hero, what-it-is, six surface cards, demo access + seeded creds, methodology strip, footer) and landing metadata description/og copy; ICU-valid
    satisfies: [AC1, AC5]
    anchor: messages/en.json:6
  - id: F4
    path: src/widgets/landing/index.ts
    action: new
    intent: public API of the landing widget — export LandingPage and its copy types only
    satisfies: [AC6]
  - id: F5
    path: src/widgets/landing/ui/LandingPage.tsx
    action: new
    intent: pure presentational widget root (props-in, no data fetching, no async) composing Hero/SurfaceShowcase/DemoAccess/MethodologyStrip/SiteFooter under a <main>; token-only
    satisfies: [AC1, AC2, AC4]
  - id: F6
    path: src/widgets/landing/ui/Hero.tsx
    action: new
    intent: hero section — product name (h1), tagline, sub-lead, primary "Try the live demo" CTA + secondary link; token-only, locale-aware next-intl Link
    satisfies: [AC2, AC4]
  - id: F7
    path: src/widgets/landing/ui/SurfaceShowcase.tsx
    action: new
    intent: grid of the six analytics surfaces (trends, funnels, retention, segmentation, dashboards, AI query) as descriptive cards with decorative aria-hidden icons; token-only
    satisfies: [AC1, AC2, AC4]
  - id: F8
    path: src/widgets/landing/ui/DemoAccess.tsx
    action: new
    intent: a try-the-live-demo block surfacing the seeded credentials (e.g. alice@capcom.dev / password123) and a CTA into /sign-in; token-only
    satisfies: [AC1, AC2, AC4]
  - id: F9
    path: src/widgets/landing/ui/MethodologyStrip.tsx
    action: new
    intent: a how-it-is-built strip (ADR discipline, RLS isolation, in-DB SQL, token/FSD governance, the test pyramid) with links to the repo docs; token-only
    satisfies: [AC2, AC4]
  - id: F10
    path: src/widgets/landing/ui/SiteFooter.tsx
    action: new
    intent: footer landmark with repo / roadmap / license links and the built-on-starter attribution; token-only
    satisfies: [AC2, AC4]
  - id: F11
    path: src/widgets/landing/model/content.ts
    action: new
    intent: pure types for the landing copy (LandingCopy) and the fixed surface-id list the showcase maps over; no runtime copy (copy comes from next-intl)
    satisfies: [AC1, AC6]
  - id: F12
    path: src/widgets/landing/model/jsonld.ts
    action: new
    intent: pure buildLandingJsonLd(siteUrl, strings) returning the WebSite + SoftwareApplication structured-data object with absolute URLs
    satisfies: [AC3]
  - id: F13
    path: src/widgets/landing/ui/LandingPage.test.tsx
    action: new
    intent: RTL unit test rendering the REAL composed LandingPage with a copy fixture (inside NextIntlClientProvider locale="en", so every section component executes and stays in the >=80% coverage denominator) — asserts the h1, all six surface cards, the visible demo credentials, and the primary CTA href (the locale-prefixed /en/sign-in)
    satisfies: [AC2]
  - id: F14
    path: src/widgets/landing/model/jsonld.test.ts
    action: new
    intent: unit test for buildLandingJsonLd — valid @context/@type, absolute URLs, WebSite + SoftwareApplication present
    satisfies: [AC3]
  - id: F15
    path: src/widgets/landing/ui/LandingPage.stories.tsx
    action: new
    intent: CSF3 stories (Default + Dark) under the axe a11y gate (ADR 0039) — the a11y-clean proof; wrapped in NextIntlClientProvider
    satisfies: [AC2]
  - id: F16
    path: scripts/gen-og-image.mjs
    action: new
    intent: one-off generator that rasterizes an on-brand 1200x630 card to public/og.png via Playwright chromium (dev-only; the committed PNG is the runtime artifact; requires `npx playwright install chromium` if the browser binary is absent)
    satisfies: [AC3]
  - id: F17
    path: public/og.png
    action: new
    intent: committed static Open Graph image (1200x630) referenced by the metadata
    satisfies: [AC3]
  - id: F18
    path: .github/workflows/ci.yml
    action: edit
    intent: replace the two deferral comment blocks with a real e2e job (DEV-001 — checkout, Node 24, npm ci, playwright install, supabase start, db:reset, gen:types drift check, export local keys to GITHUB_ENV, seed:events with the pinned anchor, test:e2e) and a storybook-smoke job (DEV-002 — build-storybook, serve, test:storybook); all workflow action refs SHA-pinned
    satisfies: [AC7, AC9]
    anchor: .github/workflows/ci.yml:224
  - id: F19
    path: e2e/landing.spec.ts
    action: new
    intent: browser journey — load /en, assert the hero h1 + a surface card + the visible demo credential text, follow the primary CTA to /en/sign-in, and assert the JSON-LD script is present
    satisfies: [AC1, AC8]
  - id: F20
    path: docs/deviations.md
    action: edit
    intent: move DEV-001 and DEV-002 to Resolved with the resolving PR recorded in Status
    satisfies: [AC9]
    anchor: docs/deviations.md:35
  - id: F21
    path: README.md
    action: edit
    intent: replace the PR-0 status with the behind-the-scenes case study — data model + auth-user≠profile split, in-DB SQL aggregations, RLS isolation, token/FSD governance, the test pyramid, ADR discipline; refresh status/roadmap pointer
    satisfies: [AC9]
    anchor: README.md:30
  - id: F22
    path: docs/capcom/PROGRESS.md
    action: edit
    intent: flip the PR-9 status row to "merged (PR #14)" (first housekeeping step), add the PR-10 delivery section, and set the PR-10 status row
    satisfies: [AC9]
    anchor: docs/capcom/PROGRESS.md:21
  - id: F23
    path: .cspell/project-words.txt
    action: edit
    intent: add any new technical words introduced by the README case study / landing docs so check:spelling stays green
    satisfies: [—]
  - id: F24
    path: e2e/smoke.spec.ts
    action: edit
    intent: the existing smoke test navigates to / (now the landing) and asserts zero console/page errors with NO allowlist — verify it stays green after the repurpose and update the level-1-heading assertion if the hero text it keys on changes; the zero-error assertion must hold for the JSON-LD script + new markup
    satisfies: [AC8]
    anchor: e2e/smoke.spec.ts:1
build_order:
  [
    F11,
    F12,
    F6,
    F7,
    F8,
    F9,
    F10,
    F5,
    F4,
    F14,
    F13,
    F15,
    F3,
    F2,
    F1,
    F16,
    F17,
    F19,
    F18,
    F20,
    F21,
    F22,
    F23,
    F24,
  ]
depends_on: []
contract:
  kind: none
criteria:
  - id: AC1
    statement: Given an unauthenticated visitor at /en, when the home route renders, then the landing shows the hero, the six analytics-surface cards, the visible seeded demo credentials, and a primary CTA that navigates to /en/sign-in — all copy via next-intl, no placeholder text.
    implemented_by: [F1, F3, F4, F5, F6, F7, F8, F11, F19]
    oracle:
      kind: test
      ref: e2e/landing.spec.ts::renders the landing, shows demo access, and links into the app
    failure: the old single-heading placeholder renders, a surface card is missing, the CTA does not reach sign-in, or copy is hard-coded.
  - id: AC2
    statement: Given a copy fixture, when LandingPage is rendered, then it exposes one h1, all six surface cards, the demo credentials, and the primary CTA href — the composed sections render their content.
    implemented_by: [F5, F6, F7, F8, F9, F10, F11, F13]
    oracle:
      kind: test
      ref: src/widgets/landing/ui/LandingPage.test.tsx::renders the hero, six surface cards, demo credentials, and the primary CTA
    failure: a section renders empty, the heading hierarchy is wrong, or the credentials/CTA are absent.
  - id: AC3
    statement: Given the site origin, when the home page renders, then it emits valid JSON-LD (WebSite + SoftwareApplication, @context set, absolute URLs) and the metadata carries the static OG/Twitter image and a landing description.
    implemented_by: [F1, F2, F12, F14, F17]
    oracle:
      kind: test
      ref: src/widgets/landing/model/jsonld.test.ts::emits WebSite and SoftwareApplication JSON-LD with absolute URLs
    failure: malformed/empty JSON-LD, relative URLs, or a missing OG image reference.
  - id: AC4
    statement: Given the landing widget source, when the design-token gate runs, then it passes — no raw color/size literals, no Tailwind numbered palette, no inline-style raw values, no raw SVG fill/stroke.
    implemented_by: [F5, F6, F7, F8, F9, F10]
    oracle:
      kind: command
      ref: npm run check:tokens
    failure: a raw hex/oklch/size literal or numbered-palette class appears in a landing component.
  - id: AC5
    statement: Given the new Landing namespace, when the i18n gate runs, then ICU validity holds over the source catalog (key parity is vacuous at one locale, but stays enforced for when a second locale lands).
    implemented_by: [F3]
    oracle:
      kind: command
      ref: npm run check:i18n
    failure: malformed ICU in a landing string, or a parity break if/when a second locale lands.
  - id: AC6
    statement: Given the landing slice, when the FSD + boundary gates run, then they pass — imports go downward only, no widget→widget import, and the slice is reached through its public index.ts.
    implemented_by: [F4, F5, F11]
    oracle:
      kind: command
      ref: npm run check:fsd
    failure: a widget imports another widget, or a consumer deep-imports a segment bypassing index.ts.
  - id: AC7
    statement: Given the edited workflow, when the action-pin gate runs, then every action ref in ci.yml (including any added to the new jobs) is pinned to a full commit SHA.
    implemented_by: [F18]
    oracle:
      kind: command
      ref: npm run check:action-pins
    failure: a new job references an action by tag/branch instead of a SHA.
  - id: AC8
    statement: Given a local Supabase stack prepared by the same steps the DEV-001 job authors (supabase up → db:reset → gen:types drift → seed:events at the pinned 2026-06-24 anchor → SUPABASE_SECRET_KEY exported), when the Playwright suite runs, then every spec is green — the existing rls-/ingest/trends/funnels/retention/segments/dashboards/ai-query specs and the new landing.spec.ts and the repurposed smoke.spec.ts.
    implemented_by: [F1, F5, F19, F24]
    oracle:
      kind: command
      ref: npm run test:e2e
    failure: an e2e spec fails because the seed/migrations were not loaded before Playwright, or the landing breaks smoke.spec.ts's zero-console-error assertion.
  - id: AC9
    statement: Given the PR-10 deliverables, when the docs and the workflow diff are reviewed, then README carries the behind-the-scenes case study (data model, in-DB SQL, RLS, token/FSD governance, test pyramid, ADR discipline), PROGRESS records the PR-9-merged flip + PR-10 delivery, the DEV-001 e2e + DEV-002 storybook-smoke jobs are authored in ci.yml with the correct step ordering, both deviations are moved to Resolved, and no version bump / CHANGELOG entry was made (deferred to the human release step).
    implemented_by: [F18, F20, F21, F22]
    oracle:
      kind: prose-review
    failure: the README is still the PR-0 stub, the PR-9 row still says "ready on feat/ai-query", a deviation entry is still active, the e2e job is missing a preparation step (supabase/db:reset/seed/key-export), or a release artifact was cut prematurely.
```

## Host Bindings

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: madr
  path: docs/decisions/
merge_obligations:
  - "quality gate green: typecheck, lint, format:check, check:design-system (tokens+contrast+boundaries+graph+design-intent+seals+i18n), check:fsd, check:citations, check:claude(+md), check:gates, gen:tokens drift, build, test:coverage >=80%"
  - "e2e green locally (npm run test:e2e) + storybook smoke green locally (build-storybook -> serve -> test:storybook)"
  - "Conventional Commits (commitlint); no AI attribution"
  - "PR into dev; human merges; the dev->main release is a separate human step"
gates:
  test: npm run test
```

## Data & Config

N/A — no migration, no schema change, no new env var. `env.NEXT_PUBLIC_SITE_URL` (already present,
defaults to `http://localhost:3000`) drives canonical/OG absolute URLs and the JSON-LD `url`; the real
production value is provisioned in Vercel by a human (ADR 0009/0018). No new runtime dependency: the OG
image is a committed static asset; `scripts/gen-og-image.mjs` uses the already-installed Playwright
chromium and runs dev-only. The DEV-002 smoke serves `storybook-static` with an ephemeral `npx -y`
static server (no new package.json dependency).

## Chosen Approach

A new FSD widget slice `src/widgets/landing/` holds all the markup so the token gate covers it (it
covers `src/widgets/**` but not `src/app/**`). The home route `src/app/[locale]/page.tsx` stays a thin,
coverage-excluded RSC container: it `setRequestLocale`s, reads the `Landing` namespace via
`getTranslations`, assembles a typed `copy` object, renders the pure presentational `<LandingPage
copy=… />`, and injects a JSON-LD `<script type="application/ld+json">`. Sections (Hero,
SurfaceShowcase, DemoAccess, MethodologyStrip, SiteFooter) are pure props-in components (no `"use
client"`, no async, no fetching) so they unit-test in jsdom and render deterministically in Storybook;
locale-aware links use the next-intl `Link`. SEO rides ADR 0031: `generateMetadata` adds a
landing-specific description, the layout adds the static OG/Twitter image, and JSON-LD is rendered in
the page (the Metadata API does not model JSON-LD). The OG image is generated once by
`scripts/gen-og-image.mjs` (Playwright → `public/og.png`) and committed. CI re-enable authors two jobs
in `ci.yml`: the DEV-001 e2e job (supabase start → `db:reset` → `gen:types` drift check → export local
keys to `GITHUB_ENV` so `next start` and `seed:events` see `SUPABASE_SECRET_KEY` → `seed:events` with
the pinned anchor → `test:e2e`) and the DEV-002 Storybook smoke (build-storybook → serve → `test:storybook`),
then `docs/deviations.md` moves both entries to Resolved. The README gains the behind-the-scenes case
study. Single-locale (en); no second locale and no dynamic OG → no new ADR (the landing rides 0030/0031,
the CI re-enable rides 0007/0010/0008, the closure is a deviations status flip).

**Stack compliance:** NATIVE
**Future alignment:** N/A (no VISION.md)

**Stack extensions required:**

- none

## Why this over alternatives

- Landing markup directly in `src/app/[locale]/page.tsx` (rejected): `src/app/**` is not covered by the
  token eslint glob or `check:tokens`, so "token-only" would be convention, not a gate — violating the
  hard constraint that the allowed-token list is enforced.
- Landing sections as `src/components/landing/*` primitives (rejected): `check:stories` mandates colocated
  stories for every `src/components/**` module and the composition-graph/design-intent gates target that
  kit — forcing a full story matrix + `design-intent.ts` on page-specific marketing one-offs, and miscasting
  page composition as reusable primitives (ADR 0065 puts one-off compositions in widgets/app, not the kit).
- Dynamic OG via `next/og` ImageResponse (rejected for this PR): ADR 0031 explicitly defers dynamic OG image
  generation to a follow-on decision, so it would require drafting an ADR first; a static committed asset stays
  inside 0031 and matches the chosen scope.
- Adding a second locale now (rejected for this PR): `check:i18n` enforces parity across every existing
  namespace, so a locale would force machine-drafting ~150 keys app-wide — scope creep on an already broad PR;
  it is a clean follow-up MINOR (ADR 0080) and the machinery is already multi-locale-ready (ADR 0030).

## Test Plan

- Harness: Vitest (`npm run test` — unit jsdom + Storybook browser-mode), Playwright (`npm run test:e2e`),
  Storybook test-runner (`npm run test:storybook`).
- Test locations: unit/story colocated under `src/widgets/landing/**` (`*.test.tsx`, `*.stories.tsx`);
  the model unit test under `src/widgets/landing/model/`; e2e in `e2e/landing.spec.ts`.
- Conventions: render intl-using components inside `NextIntlClientProvider locale="en" messages={en.json}`
  (per `TrendsExplorer.test.tsx`); stories carry the axe a11y gate via the preview `a11y: { test: "error" }`
  parameter and a per-story NextIntlClientProvider decorator; e2e signs in / navigates through the real UI
  (per `ai-query.spec.ts`). New widget `.tsx`/`.ts` files are in the coverage denominator (`src/widgets/**`)
  and are covered by the unit test + story; the route container and the dev-only OG script are excluded
  (route already at `vitest.config.mts:100`; `scripts/**` is outside the coverage include).

## Definition of Done

- [ ] `npm run test` green; `npm run test:coverage` ≥80% (ADR 0008)
- [ ] typecheck / lint / format:check / build green
- [ ] `check:design-system` (tokens + contrast + boundaries + graph + design-intent + seals + i18n),
      `check:fsd`, `check:citations`, `check:claude`/`check:claude-md`, `check:gates`, `check:action-pins`,
      `check:spelling`, `gen:tokens` drift — all green
- [ ] `npm run test:e2e` green locally (incl. `ai-query.spec.ts` + the new `landing.spec.ts`) and the
      Storybook smoke green locally (`build-storybook` → serve → `test:storybook`)
- [ ] DEV-001 + DEV-002 jobs authored in `ci.yml`; both deviations moved to Resolved
- [ ] README case study written; PROGRESS PR-9 row flipped + PR-10 delivery recorded
- [ ] no version bump and no CHANGELOG entry (the `dev → main` release is a separate human step, ADR 0080)
- [ ] PR opened into `dev`; no AI attribution in commits/PR (ADR 0046/0072)

## Non-goals

- A second locale (deferred follow-up MINOR; machinery stays ready).
- Dynamic `next/og` OG image generation (deferred — would need its own ADR per 0031).
- Cutting the `dev → main` release: version bump, CHANGELOG entry, annotated tag, GitHub Release are the
  human release ritual (ADR 0080), performed after this PR merges to `dev`.
- Marking DEV-001/DEV-002 as required checks (a human branch-protection setting, ADR 0046) — observe-green
  first.
- Any new aggregation, migration, RPC, or chart renderer (the landing is public/static; surfaces are
  described, not deep-linked — they are RLS-gated behind auth).

## Assumptions

- The seeded demo credentials may be shown publicly (data is seeded, behind RLS) — chosen explicitly
  ("Full + visible demo creds").
- GitHub `ubuntu-latest` runners have Docker preinstalled, so `npx supabase start` works in the DEV-001 job
  (documented Supabase CI posture); the local stack's `SECRET_KEY` is read from `supabase status` and exported
  to `GITHUB_ENV` for the ingest route + seed generator.
- The Storybook smoke may serve `storybook-static` with an ephemeral `npx -y` static server (no new pinned
  dependency); if that proves unreliable a pinned devDependency is the fallback (license/audit-checked).

## Open Questions

none

## Security / NFR

- No new auth, secret, or data path. `AI_API_KEY`/secrets stay server-only (unchanged). The DEV-001 job
  handles only the LOCAL stack's well-known dev keys (read from `supabase status`), never a production secret;
  nothing is logged. The landing is public and static — no user input, no injection surface.
- a11y: WCAG 2.2 AA — semantic landmarks (`main`/`footer`), correct heading order, discernible link text,
  decorative icons `aria-hidden`; enforced by the axe gate over the story (ADR 0039).
- NFR: the landing is zero-client-JS (pure RSC/presentational) for fast first paint and crawlability; SEO via
  canonical/hreflang + OG/Twitter + JSON-LD (ADR 0031).

## Critic Verdict & Overrides

marvin-tm-spec-critic verdict: **PASS WITH WARNINGS** (no blockers). The critic confirmed the
load-bearing claims against the codebase (the `check:tokens` glob covers `src/widgets/**` not
`src/app/**`; `check:stories`/`check:graph`/`check:design-intent` are scoped to `src/components` so the
widget slice avoids them; `react/no-danger` is off so JSON-LD adds no `check:debt` entry; the
seed/anchor coupling and the `HomePage`-namespace repurpose are correct). Warnings addressed in this
revision:

- **AC8 overclaimed** vs its `npm run test:e2e` oracle — rescoped AC8 to "the local suite is green
  against a stack prepared by the job's steps," and moved the _authored-CI-job-correctness_ + deviations
  resolution to AC9's prose-review (over the workflow diff + docs).
- **`e2e/smoke.spec.ts`** exercises `/` (F1's output) with a no-allowlist zero-console-error assertion —
  added as **F24** (edit) so the executor must keep it green / update its h1 assertion.
- **AC5** parity is vacuous at one locale — statement trimmed to the ICU half it actually proves.
- **F13** clarified to render the _real composed_ LandingPage (coverage denominator); **F16** notes the
  chromium binary prerequisite.

Override (scope gate): the DoR `fcp-size` warning (now 24 files) is **consciously accepted** — this is
the single deliberate "release-prep" PR the roadmap defines (landing + i18n/SEO + CI re-enable), the
file count inflated by the natural FSD slice fan-out (one widget = 8 small ui/model files + 3
tests/stories). The critic agreed it should not be split (the only seam, the CI re-enable, depends on
the landing existing for `landing.spec.ts`). Delivered as clean per-workstream commits.

## Design Notes

- Repurpose the `HomePage` namespace into `Landing` rather than adding alongside (it has no other caller),
  keeping the catalog tidy.
- JSON-LD is rendered via `dangerouslySetInnerHTML` on a `<script type="application/ld+json">` (the documented
  Next.js pattern; the payload is our own static JSON). If `react/no-danger` is enabled in the flat config,
  prefer keeping it off this one well-known SEO line rather than introducing a justified `eslint-disable`
  (which would add a `check:debt` entry) — verify during lint.
- Keep `LandingPage` synchronous and props-in so it stays in the coverage denominator and unit-tests without an
  async/server-only shim; the only async/RSC code is the already-excluded route container.
- Write so a second locale is a pure `messages/<locale>.json` add (no landing code change) and so the static OG
  asset can later be swapped for a dynamic `next/og` route behind its own ADR.

## Future Considerations

- Second locale (ru/de/es) as a MINOR PR — drafts every namespace from en via the add-translation skill.
- Dynamic `next/og` OG image (ADR-gated) replacing the static asset.
- The first `dev → main` production promotion + release ritual (ADR 0080) — human-coordinated, post-merge.
- Marking DEV-001/DEV-002 required checks after one observed-green cycle (branch protection, human).

## Delivery

- **PR:** [capcom#15](https://github.com/real-case/capcom/pull/15) (`feat/landing` → `dev`),
  delivered as 6 clean per-workstream commits (+ 2 opening housekeeping commits: the PR-9 status
  flip + spec, and the spec-critic agent memory).
- **Verification:** all gates green — `tsc` · `lint` · `format:check` ·
  `check:design-system` (tokens/contrast/boundaries/graph/design-intent/seals/i18n) · `check:fsd` ·
  `check:citations` · `check:claude(+md)` · `check:gates` · `check:action-pins` · token-drift ·
  `check:spelling` · `build` · **`test:coverage` 91.19% stmts / 93.63% lines** (357 tests) ·
  **`test:e2e` 65 passed** (incl. `ai-query.spec.ts` UI sign-in + new `landing.spec.ts`) ·
  **storybook smoke 11 suites / 81 stories**. `adr-conformance-reviewer`: **CLEAN** (no blockers,
  human-only actions correctly deferred).
- **SPEC GAP — one file outside the contract `files` allowlist.** `.storybook/test-runner.ts`
  was edited (comment only) to correct a now-stale "the CI job is deferred" note when DEV-002 was
  re-enabled — not listed in the contract. Benign (a doc-comment fix tied to the DEV-002 closure);
  disclosed here per the immutability discipline. All 24 contract files were touched as specified.
- **Human-only follow-ups (ADR 0046/0080), deliberately not done:** the `dev` merge; marking the
  two new CI jobs as required branch-protection checks (after observed-green); and the first
  `dev → main` promotion + release ritual (MINOR bump `0.1.0` → `0.2.0`, human-edited CHANGELOG,
  annotated tag + GitHub Release).
