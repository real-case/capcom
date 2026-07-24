import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // ADR 0041: a SINGLE Vitest workspace with TWO projects measuring the same
    // `src/**` — the unit/RTL project (jsdom, ADR 0007) and the Storybook
    // stories-as-tests project (browser mode, ADR 0035→0035/0037). One V8 coverage
    // provider with one include/exclude set merges both into the single ≥80% gate
    // (ADR 0008): a line covered by a story-test OR a unit test counts once.
    projects: [
      {
        // ADR 0007: unit / component (RTL) tests, colocated, under jsdom.
        plugins: [react()],
        resolve: {
          // Honor the `@/*` alias from tsconfig.json.
          tsconfigPaths: true,
        },
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
          // Expose afterEach globally so React Testing Library auto-cleans the DOM
          // between tests; test files still import from "vitest".
          globals: true,
          // next-intl's pre-built ESM imports `next/navigation` as a bare, extension-
          // less specifier; Next 16 ships no `exports` map, so Vitest's externalized
          // (Node-strict) resolver can't resolve it. Inlining next-intl routes its
          // internal imports through Vite's lenient resolver (ADR 0030 testability).
          server: { deps: { inline: ["next-intl"] } },
        },
      },
      {
        // ADR 0035 (superseded by 0035) / 0037: stories run as browser-mode component
        // tests via the Storybook Vitest addon. `storybookTest` discovers stories from
        // .storybook/main.ts and loads the nextjs-vite Vite plugin itself (which also
        // resolves the `@/*` tsconfig paths), so this project does NOT add
        // @vitejs/plugin-react — that would double the JSX transform.
        plugins: [
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
            storybookScript: "npm run storybook -- --no-open",
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            // Reuse the Playwright browser stack already in the project (ADR 0007).
            // Vitest 4 split providers into packages: `provider` is the playwright()
            // instance from `@vitest/browser-playwright`, not the legacy string.
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
          // No setupFiles: since Storybook 10.3, `@storybook/addon-vitest` auto-applies
          // the .storybook/preview annotations and the addon-a11y gate (ADR 0039), so a
          // hand-written setProjectAnnotations file would only be skipped with a warning.
        },
      },
    ],
    coverage: {
      // ADR 0041: one V8 provider, one include/exclude set for all projects.
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // ADR 0008: tests, stories, generated types, and pure scaffolding are
        // excluded so the denominator reflects meaningful application code.
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.tsx",
        // ADR 0062: the colocated `*.design-intent.ts` specs are declarative
        // typed data (no executable logic) — like the design-system artifacts
        // below, they are verified by `tsc --noEmit` + `check:design-intent`
        // (api↔props, state coverage, graph reconciliation), not by runtime
        // coverage. Excluded so the denominator stays meaningful application code.
        "src/components/**/*.design-intent.ts",
        "src/lib/supabase/database.types.ts",
        // ADR 0058/0059/0061: the design-system root artifacts are declarative
        // single sources of truth — controlled vocabularies, state registries, and
        // the generated token union — with no executable logic. They are verified
        // by `tsc --noEmit` (a broken role/archetype/token reference fails typecheck)
        // and `gen:tokens` drift (ADR 0015-style), not by runtime coverage.
        "src/design-system/**",
        // next/font wiring cannot execute outside the Next.js compiler; the
        // root layout is exercised by `next build` and the e2e smoke.
        "src/app/[locale]/layout.tsx",
        // ADR 0030 request-pipeline wiring: these only run inside Next's
        // request lifecycle (locale params, middleware, getRequestConfig), so
        // they can't execute under jsdom; `next build` + the i18n e2e spec
        // exercise them. Their pure helpers (metadata, sitemap, robots) are
        // unit-tested directly.
        "src/app/[locale]/page.tsx",
        "src/i18n/request.ts",
        "src/proxy.ts",
        // `server-only` throws outside a React Server context, so unit tests
        // cannot import this module; it is pure schema declaration whose
        // logic (parseEnv) is tested via env.ts, and the fence itself is
        // exercised by `next build` (ADR 0018 confirmation experiment).
        "src/lib/env.server.ts",
        // ADR 0013/0016 request-pipeline wiring: the Supabase client factories
        // run only inside Next's request lifecycle (cookies, getUser,
        // server-only). They can't execute under jsdom and are exercised by
        // `next build` + e2e once feature routes land.
        "src/lib/supabase/**",
        // PR-9 (ADR 0091): the runtime AI client imports the server-only env
        // (the AI secret) — `server-only` throws under jsdom, so it can't be
        // imported by a unit test; it's exercised by `next build` + the ai-query
        // e2e. Its pure translation logic (spec/interpreter/prompt/translate) lives
        // in the feature model layer and is unit-tested directly with a stubbed
        // client (ADR 0018/0075/0091).
        "src/lib/ai/**",
        // ADR 0019/0025/0027 Next-runtime wiring: the global error boundary
        // renders its own <html>, the localized not-found and catch-all use the
        // router/Next request lifecycle, and the provider tree mounts
        // QueryClient + NuqsAdapter — none execute under jsdom. They are
        // exercised by `next build` + the e2e specs; their pure logic (logger,
        // stores, parsers, query keys, get-query-client) and the client
        // `error.tsx` UI are unit-tested directly.
        "src/app/global-error.tsx",
        "src/app/providers.tsx",
        "src/app/[locale]/not-found.tsx",
        // `[[]` escapes the literal `[` so the glob matches the `[...rest]`
        // catch-all dir — the `[.` in `[...rest]` would otherwise be parsed as a
        // POSIX collating-symbol opener and never match.
        "src/app/[locale]/[[]...rest]/page.tsx",
        // PR-2 (ADR 0083): the (auth)/(app) route files are async Server
        // Components that read cookies and call getUser, and the auth Server
        // Actions import the server-only Supabase chain — none execute under
        // jsdom. They are exercised by `next build` + the e2e specs (RLS
        // isolation + smoke); the pure logic (schemas, role ladder, entity
        // queries) and client UI (forms, switcher) are unit-tested directly.
        // `*` matches the (auth)/(app) route-group segment and the [projectId]
        // dynamic segment — the literal parens/brackets are not glob-matchable
        // here, but a single-segment `*` is exact enough (these are the only
        // route-group children).
        "src/app/[locale]/*/sign-in/page.tsx",
        "src/app/[locale]/*/sign-up/page.tsx",
        "src/app/[locale]/*/layout.tsx",
        "src/app/[locale]/*/p/page.tsx",
        // ADR 0101 Phase 3: the workspace launcher's route-level Suspense fallback —
        // an async-boundary skeleton that never runs under jsdom, same rationale as the
        // project-scoped `p/*/loading.tsx` below. Covered by `next build`; the launcher
        // widget it stands in for is unit-tested directly.
        "src/app/[locale]/*/p/loading.tsx",
        "src/app/[locale]/*/p/*/page.tsx",
        // PR-13: the project-scoped shell layout is an async Server Component that
        // resolves the project + org + project list under RLS, and `loading.tsx` is a
        // route-level Suspense fallback — neither runs under jsdom. Covered by
        // `next build` + the shell e2e; the shell chrome (AppShell, SidebarNav,
        // CommandPalette) and the hub (ProjectHub) are unit-tested directly.
        "src/app/[locale]/*/p/*/layout.tsx",
        "src/app/[locale]/*/p/*/loading.tsx",
        // PR-4 (ADR 0084): the trends route is one segment deeper than the
        // overview page above, so it needs its own entry — same rationale (an
        // async Server Component that resolves the project under RLS, exercised by
        // `next build` + e2e). Its interactive client feature, the entity RPC
        // fetchers, the nuqs url-state, and the chart widgets are tested directly.
        "src/app/[locale]/*/p/*/trends/page.tsx",
        // PR-5 (ADR 0087): the funnels route, same shape as trends above — an async
        // Server Component resolving the project under RLS, covered by `next build` +
        // e2e. Its builder client, the `fetchFunnel` RPC fetcher, the nuqs url-state,
        // and the FunnelChart widget are tested directly.
        "src/app/[locale]/*/p/*/funnels/page.tsx",
        // PR-6 (ADR 0088): the retention route, same shape as funnels above — an async
        // Server Component resolving the project under RLS, covered by `next build` +
        // e2e. Its grid client, the `fetchRetention` RPC fetcher, the nuqs url-state,
        // and the CohortGrid widget are tested directly.
        "src/app/[locale]/*/p/*/retention/page.tsx",
        // PR-7 (ADR 0089): the segments route, same shape as retention above — an async
        // Server Component resolving the project under RLS, covered by `next build` +
        // e2e. Its builder client, the `fetchSegment*` RPC fetchers, the nuqs url-state,
        // the `[segment]` rule schema, and the SegmentDistribution widget are tested directly.
        "src/app/[locale]/*/p/*/segments/page.tsx",
        // PR-8 (ADR 0090): the dashboards route, same shape as segments above — an async
        // Server Component resolving the project under RLS, covered by `next build` +
        // e2e. Its manager client, the report/dashboard fetchers, the optimistic mutation
        // hooks, and the DashboardBoard widget are tested directly.
        "src/app/[locale]/*/p/*/dashboards/page.tsx",
        // PR-9 (ADR 0091): the AI-query route, same shape as the surfaces above — an
        // async Server Component resolving the project under RLS + reading
        // `isAiConfigured()` (server-only), covered by `next build` + the ai-query
        // e2e. Its manager client, the translation orchestration, and the panel are
        // tested directly.
        "src/app/[locale]/*/p/*/ask/page.tsx",
        "src/features/auth-by-email/api/actions.ts",
        // PR-8 (ADR 0090): the saved-analysis Server Actions ("use server") run on the
        // Node runtime under the caller's RLS and can't execute under jsdom — covered by
        // `next build` + the dashboards e2e (write-RBAC + composition). Their input
        // schemas (the [report] envelope) are unit-tested directly.
        "src/features/report-actions/api/actions.ts",
        // PR-9 (ADR 0091): the translation Server Action ("use server") imports the
        // server-only AI client + getCurrentUser — it can't execute under jsdom.
        // Covered by `next build` + the ai-query e2e; the pure `translate`
        // orchestration it wraps is unit-tested directly with a stubbed client.
        "src/features/ai-query/api/actions.ts",
        // PR-3 (ADR 0085): the ingest route handler imports the server-only
        // service-role client and builds NextResponse on the Node runtime — it
        // can't execute under jsdom. It is exercised by `next build` + the ingest
        // e2e spec (full 202/401/403/422 contract + project-scoped write); its
        // pure logic (the [ingest] Zod schema, key extraction/hashing) is
        // unit-tested directly in src/lib/ingest.
        "src/app/api/ingest/route.ts",
      ],
      // ADR 0008: global ≥80% on statements/lines gates the merge; branch
      // coverage is tracked in reports and may be tightened later.
      thresholds: {
        statements: 80,
        lines: 80,
      },
      reporter: ["text", "lcov"],
    },
  },
});
