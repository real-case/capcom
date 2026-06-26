# Architecture Decision Records

Architecture Decision Records for this project, in [MADR](https://adr.github.io/madr/) format. Each record captures one decision and the reasoning behind it.

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-record-decisions-as-madr-adrs.md) | Record architectural decisions as MADR-format ADRs under docs/decisions/ | accepted | 2026-06-11 |
| [0002](0002-nextjs-app-router-server-components.md) | Adopt Next.js App Router with React Server Components as the default | accepted | 2026-06-11 |
| [0003](0003-typescript-strict-mode-no-any.md) | TypeScript in strict mode, with `any` disallowed | accepted | 2026-06-11 |
| [0004](0004-node-24-lts-runtime.md) | Node.js 24 LTS as the runtime, with a Node-first route runtime | accepted | 2026-06-11 |
| [0005](0005-package-manager-npm.md) | npm as the package manager of record | accepted | 2026-06-11 |
| [0006](0006-eslint-prettier-lint-format.md) | ESLint (flat config) and Prettier for linting and formatting | accepted | 2026-06-11 |
| [0007](0007-testing-vitest-rtl-playwright.md) | Testing with Vitest + React Testing Library (unit/component) and Playwright (e2e) | accepted | 2026-06-11 |
| [0008](0008-test-coverage-threshold-gate.md) | Mandatory 80% global test-coverage threshold gating PR merge, except hotfixes | accepted | 2026-06-11 |
| [0009](0009-hosting-vercel-preview-production.md) | Hosting on Vercel with Git-integrated preview and production deployments | accepted | 2026-06-11 |
| [0010](0010-ci-pipeline-github-actions.md) | CI quality gate on GitHub Actions, with Vercel owning deploys | accepted | 2026-06-11 |
| [0011](0011-git-workflow.md) | Git workflow: git-flow-lite with a dev integration branch | accepted | 2026-06-11 |
| [0012](0012-supabase-backend-platform-baseline.md) | Supabase as the backend platform, scoped to a Postgres + RLS + Auth baseline | accepted | 2026-06-11 |
| [0013](0013-data-access-rls-supabase-ssr.md) | Data access via @supabase/ssr with RLS as the authorization boundary | accepted | 2026-06-11 |
| [0014](0014-migrations-supabase-cli.md) | Database migrations via the Supabase CLI | accepted | 2026-06-11 |
| [0015](0015-type-generation-from-schema.md) | Generate TypeScript types from the Supabase schema | accepted | 2026-06-11 |
| [0016](0016-authentication-supabase-auth.md) | Authentication via Supabase Auth, email/password as the baseline method | accepted | 2026-06-11 |
| [0017](0017-validation-zod-single-source.md) | Zod as the single source of runtime-validated schemas | accepted | 2026-06-11 |
| [0018](0018-secrets-and-environment-variables.md) | Zod-validated environment variables with a server-only secret fence | accepted | 2026-06-11 |
| [0019](0019-error-handling-and-logging.md) | Error handling via App Router boundaries and a structured stdout logger | accepted | 2026-06-11 |
| [0020](0020-forms-react-hook-form-zod.md) | Forms with React Hook Form and the Zod resolver | accepted | 2026-06-11 |
| [0021](0021-local-dev-environment-official-clis.md) | Local development environment built on the official platform CLIs | accepted | 2026-06-11 |
| [0022](0022-local-supabase-stack-supabase-cli.md) | Local Supabase stack via the Supabase CLI | accepted | 2026-06-11 |
| [0023](0023-local-app-runtime-next-dev.md) | Run the app locally with `next dev`, with environment synced via `vercel env pull` | accepted | 2026-06-11 |
| [0024](0024-dev-environment-orchestration-entrypoint.md) | A single `npm run dev` entrypoint orchestrating the local environment | accepted | 2026-06-11 |
| [0025](0025-state-management-tanstack-query.md) | Server-state on the client via TanStack Query | accepted | 2026-06-11 |
| [0026](0026-client-state-zustand-boundary.md) | Client/UI state with Zustand, bounded against TanStack Query's server state | accepted | 2026-06-11 |
| [0027](0027-typed-routes-and-nuqs-search-params.md) | Type-safe routing and URL search-param state: Next.js typed routes + nuqs | accepted | 2026-06-11 |
| [0028](0028-react-concurrency-ui-responsiveness.md) | Prefer React concurrency primitives (useTransition / useDeferredValue) for UI responsiveness | accepted | 2026-06-11 |
| [0029](0029-react-compiler.md) | Adopt the React Compiler for automatic memoization | accepted | 2026-06-11 |
| [0030](0030-internationalization-next-intl.md) | Internationalization with next-intl | accepted | 2026-06-11 |
| [0031](0031-seo-and-metadata.md) | SEO and page metadata via the App Router Metadata API | accepted | 2026-06-11 |
| [0032](0032-styling-tailwind-css.md) | Styling with Tailwind CSS, configured CSS-first | accepted | 2026-06-11 |
| [0033](0033-design-tokens.md) | Design tokens: CSS custom properties via @theme, with a neutral shadcn baseline | accepted | 2026-06-20 |
| [0034](0034-component-layer-shadcn-ui.md) | Component layer: shadcn/ui, copied into the repo and themed by design tokens | accepted | 2026-06-11 |
| [0035](0035-component-workbench-storybook.md) | Component workbench: Storybook 10 on the Vite builder, with stories doubling as tests | accepted | 2026-06-11 |
| [0036](0036-story-authoring-csf3.md) | Story authoring standard: Component Story Format 3 (CSF 3) | accepted | 2026-06-11 |
| [0037](0037-story-test-execution-engines.md) | Story-test execution: Vitest addon as the test/coverage engine, test-runner for built-Storybook smoke | accepted | 2026-06-11 |
| [0038](0038-interaction-testing-play-functions.md) | Interaction-testing standard: mandatory play functions with @storybook/test | accepted | 2026-06-11 |
| [0039](0039-accessibility-testing-gate-a11y-axe.md) | Accessibility testing as a gate: addon-a11y + axe-core, failing on violations (WCAG 2.2 AA) | accepted | 2026-06-11 |
| [0040](0040-snapshot-testing-policy.md) | Snapshot-testing policy: serialized DOM snapshots via Vitest, addon-storyshots rejected | accepted | 2026-06-11 |
| [0041](0041-coverage-merge-across-vitest-projects.md) | Coverage instrumentation and merge across the unit and story Vitest projects | accepted | 2026-06-11 |
| [0042](0042-component-story-coverage-policy.md) | Component story coverage policy: every component has stories for its meaningful states | accepted | 2026-06-11 |
| [0043](0043-visual-regression-chromatic.md) | Visual-regression testing: Chromatic over Storybook stories | accepted | 2026-06-11 |
| [0044](0044-mcp-server-configuration.md) | MCP server configuration: project-scoped, committed config with secrets by reference | accepted | 2026-06-11 |
| [0045](0045-design-handoff-figma.md) | Design handoff: code-canonical design tokens, Figma as design context via the figma MCP server | accepted | 2026-06-11 |
| [0046](0046-ai-agent-role-and-attribution.md) | AI agent role: primary implementer with enumerated human-only gates | accepted | 2026-06-11 |
| [0047](0047-human-review-of-agent-authored-prs.md) | Every PR requires human approval; AI review is a first pass, never a substitute | accepted | 2026-06-11 |
| [0048](0048-ai-code-review-advisory-pr-check.md) | AI code review as an advisory PR check grounded in the ADR corpus | accepted | 2026-06-11 |
| [0049](0049-ci-failure-triage-and-flaky-test-policy.md) | AI triage of CI failures, with explicit flake quarantine and no blind retries | accepted | 2026-06-11 |
| [0050](0050-changelog-ai-drafted-human-edited.md) | Release notes: AI-drafted changelog from merge history, human-edited before release | accepted | 2026-06-11 |
| [0051](0051-ai-drafted-story-matrices-and-play-functions.md) | AI-drafted story state matrices and play functions, with the 0042 human judgment retained | accepted | 2026-06-11 |
| [0052](0052-advisory-ai-accessibility-pass.md) | Advisory AI accessibility pass over stories for the judgment class axe cannot check | accepted | 2026-06-11 |
| [0053](0053-visual-diff-pre-classification-deferred.md) | Visual-diff AI pre-classification: defer; rely on determinism discipline and platform evolution | accepted | 2026-06-11 |
| [0054](0054-adr-code-drift-audit.md) | Scheduled AI audit of code against accepted ADR Confirmations (drift check) | accepted | 2026-06-11 |
| [0055](0055-localization-ai-first-translation.md) | Localization workflow: AI-drafted translations with human review, source locale canonical | accepted | 2026-06-11 |
| [0056](0056-security-gate-secret-scan-and-ai-review.md) | Diff-scoped security gate: blocking secret scan plus advisory AI review of recorded invariants | accepted | 2026-06-11 |
| [0057](0057-dependency-updates-automated-with-ai-triage.md) | Dependency updates: automated update PRs with AI triage, human-merged | accepted | 2026-06-11 |
| [0058](0058-token-usage-enforcement-and-codegen.md) | Token-usage enforcement and single-source token codegen from the CSS `@theme` layer | accepted | 2026-06-11 |
| [0059](0059-component-composition-dependency-graph.md) | Component composition dependency graph as a top-down analytical artifact | accepted | 2026-06-11 |
| [0060](0060-module-boundary-dependency-cruiser.md) | Module-boundary enforcement and graph reconciliation via dependency-cruiser | accepted | 2026-06-11 |
| [0061](0061-controlled-vocabularies-and-state-registries.md) | Controlled vocabularies and state registries for components | accepted | 2026-06-11 |
| [0062](0062-design-intent-spec-and-api-derivation.md) | `design-intent.ts` as component specification and usage-driven API derivation | accepted | 2026-06-11 |
| [0063](0063-anti-hallucination-approval-and-drift-seal.md) | Anti-hallucination component approval and the Figma drift seal | accepted | 2026-06-11 |
| [0064](0064-defect-log-and-reactive-fitness-growth.md) | Defect Log and reactive growth of design-system fitness functions | accepted | 2026-06-11 |
| [0065](0065-feature-sliced-design-architecture.md) | Adopt Feature-Sliced Design for application architecture | accepted | 2026-06-20 |
| [0066](0066-fsd-boundary-enforcement-steiger.md) | Enforce Feature-Sliced Design boundaries with Steiger | accepted | 2026-06-20 |
| [0067](0067-reference-integrity-gates-for-adr-citations.md) | Reference-integrity gates for ADR/CON citations across operative surfaces | accepted | 2026-06-20 |
| [0068](0068-sast-codeql-code-scanning.md) | Static application security testing via GitHub CodeQL code scanning | accepted | 2026-06-20 |
| [0069](0069-dependency-vulnerability-audit-gate.md) | Dependency vulnerability gate via `npm audit` | accepted | 2026-06-20 |
| [0070](0070-github-actions-sha-pinning-gate.md) | Enforce SHA-pinning of GitHub Actions with a fitness-function gate | accepted | 2026-06-20 |
| [0071](0071-dependency-license-compliance-gate.md) | Dependency license-compliance gate | accepted | 2026-06-20 |
| [0072](0072-conventional-commits-enforcement.md) | Enforce Conventional Commits with commitlint | accepted | 2026-06-20 |
| [0073](0073-documentation-link-check.md) | Documentation link-integrity gate (internal links) | accepted | 2026-06-20 |
| [0074](0074-documentation-spell-check.md) | Documentation spell-check with cspell | accepted | 2026-06-20 |
| [0075](0075-provider-agnostic-ai-client.md) | Provider-agnostic advisory-AI client via the OpenAI-compatible Chat Completions API | accepted | 2026-06-20 |
| [0076](0076-claude-code-hooks-edit-time-enforcement.md) | Claude Code hooks as the edit-time enforcement layer | accepted | 2026-06-20 |
| [0077](0077-skills-and-review-subagents-structural-layer.md) | Skills and review-subagents as the structural (recall) layer | accepted | 2026-06-20 |
| [0078](0078-self-testing-gates-and-debt-escape-hatch.md) | Self-testing gates and the technical-debt escape-hatch gate | accepted | 2026-06-20 |
| [0079](0079-runtime-theme-switching-deferred.md) | Runtime theme switching deferred; ship the `.dark` value layer only | accepted | 2026-06-20 |
| [0080](0080-versioning-and-release-policy.md) | Versioning and release policy: template-adapted SemVer with dev→main tagged releases | accepted | 2026-06-21 |
| [0081](0081-mission-control-design-token-vocabulary.md) | Mission-control design-token vocabulary on a re-introduced primitive layer | accepted | 2026-06-22 |
| [0082](0082-multitenant-density-runtime-theming.md) | Multi-tenant and density runtime theming via data-attributes, on a swap-only primitive layer | accepted | 2026-06-22 |
| [0083](0083-event-identity-model-and-multitenancy.md) | Event & identity model and multitenancy | accepted | 2026-06-22 |
| [0084](0084-aggregation-strategy.md) | Aggregation strategy: in-database SQL functions | accepted | 2026-06-22 |
| [0085](0085-event-ingestion-contract.md) | Event ingestion contract | accepted | 2026-06-22 |
| [0086](0086-charting-primitive-layer-visx.md) | Charting primitive layer: visx + design tokens | accepted | 2026-06-22 |
| [0087](0087-funnel-conversion-semantics.md) | Funnel conversion semantics: ordered, first-touch, total conversion window | accepted | 2026-06-26 |
| [0088](0088-retention-cohort-semantics.md) | Retention cohort semantics: acquisition cohorts, calendar periods, active-in-period | proposed | 2026-06-26 |
