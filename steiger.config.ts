// ADR 0066 — deterministic Feature-Sliced Design boundary enforcement (Steiger).
//
// FSD governs ONLY the canonical application layers (ADR 0065):
// src/{shared,entities,features,widgets}. Everything pre-FSD lives outside the FSD
// model and is ignored here — on a deliberately DISJOINT scope from the
// dependency-cruiser gate (ADR 0060, which owns src/components/**), so the two
// boundary gates never overlap or contradict:
//   • src/app          — Next.js App Router; routing + composition root (ADR 0002),
//                        plays the FSD app/pages role. Its [locale] route groups are
//                        Next conventions Steiger's FSD model does not parse.
//   • src/components/** — shadcn primitive kit + colocated stories/specs
//                        (ADR 0034 / 0058–0064), governed by dependency-cruiser.
//   • src/design-system — token / vocabulary / composition-graph governance artifacts.
//   • src/lib, src/i18n — pre-FSD shared infrastructure (env, supabase, query,
//                        stores, logger, i18n routing).
//   • loose files (proxy.ts, global.d.ts) and all colocated tests/stories.
//
// The recommended ruleset is canonical FSD. forbidden-imports (downward-only layer
// flow + same-layer slice isolation), public-api, and no-public-api-sidestep are the
// load-bearing rules; they function only because every governed layer keeps its
// canonical FSD name (app/pages/widgets/features/entities/shared) — which is why the
// pages layer is NOT renamed and Next's routing stays in src/app rather than a
// custom-named layer (ADR 0065, Considered Options).
import { defineConfig } from "steiger";
import fsd from "@feature-sliced/steiger-plugin";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Severity tuning (ADR 0066). The recommended ruleset is kept STRICT — every
    // boundary rule (forbidden-imports, public-api, no-public-api-sidestep, …) stays
    // an `error` and blocks merge. The single exception:
    //
    //   fsd/insignificant-slice → warn
    //
    // It flags a slice referenced zero or one time ("consider merging"). That is a
    // legitimate design smell, but as an `error` it fights incremental scaffolding —
    // a freshly added slice with its first single call-site would turn the build red
    // before the second consumer exists. Demoted to a warning, the signal stays
    // visible without blocking; an architecture review still acts on it. Warnings do
    // not affect the exit code, so the gate remains deterministic.
    rules: {
      "fsd/insignificant-slice": "warn",
    },
  },
  {
    ignores: [
      "./src/app/**",
      "./src/components/**",
      "./src/design-system/**",
      "./src/lib/**",
      "./src/i18n/**",
      "./src/proxy.ts",
      "./src/global.d.ts",
      "**/*.test.*",
      "**/*.stories.*",
    ],
  },
]);
