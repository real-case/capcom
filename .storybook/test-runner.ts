import type { TestRunnerConfig } from "@storybook/test-runner";

// ADR 0037: the test-runner is the BUILD-INTEGRITY SMOKE engine only. It renders
// every story against the *statically built* Storybook and runs `play` functions
// headless, catching build-only / static-only breakage the dev-mode browser addon
// never sees. Its roles deliberately do NOT overlap the Vitest addon:
//   - NO axe hook    — accessibility lives in the addon run (ADR 0039);
//   - NO coverage    — coverage is single-sourced from the Vitest projects (ADR 0041).
// So no assertion suite is duplicated across the two engines. The default runner
// behaviour (render-without-throw + play) is exactly the smoke contract; this config
// is intentionally empty beyond documenting that contract.
//
// Lean-CI note (Phase 10): this smoke pass runs LOCALLY during bootstrap
// (`npm run build-storybook` then `npm run test:storybook` against a served build);
// the CI job is deferred, mirroring the Phase 7 e2e deferral. The Vitest addon
// (coverage + a11y + interaction) and the ≥80% merged gate still run in CI.
const config: TestRunnerConfig = {};

export default config;
