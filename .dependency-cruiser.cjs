// ADR 0060 — module-boundary enforcement (the import-graph half; the composition
// graph↔import reconciliation is scripts/check-composition-graph.mjs). Non-FSD layout
// (ADR: src/app + src/components/ui + src/lib, single `@/*` alias), so boundaries are
// expressed as path globs: `src/components/ui/**` is the PRIMITIVE layer; composites
// live elsewhere under `src/components/**`.
//
// v1 enforces the two rules that are correct AND green on the current tree:
//   • no-circular        — a cycle breaks the L1 wave topology (Stage 6).
//   • primitive↛composite — a primitive must never import a composite (problem P5).
// Deferred (documented in the plan, not yet active to avoid false positives):
//   • public-API-only (index.ts) — the repo imports components directly today; turning
//     this on needs barrel files + an import rewrite, a separate decision.
//   • no-orphans — needs Next entry-point config (pages/layouts/route handlers are loaded
//     by convention, not imported) or it flags them falsely.

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "A dependency cycle breaks the L1 wave topology and reuse reasoning (ADR 0060).",
      from: {},
      to: { circular: true },
    },
    {
      name: "primitive-not-import-composite",
      severity: "error",
      comment:
        "A primitive (src/components/ui/**) must not import a composite — that inverts the dependency " +
        "direction and leaks composition into the primitive (ADR 0060, problem P5).",
      from: { path: "^src/components/ui/" },
      to: { path: "^src/components/(?!ui/)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    // Resolve the `@/*` alias and follow type-only imports (strict TS, ADR 0003).
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    exclude: {
      path: "(^|/)(\\.next|node_modules|coverage|storybook-static|test-results|playwright-report)(/|$)",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
