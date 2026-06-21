#!/usr/bin/env node
// scripts/check-gates.mjs
//
// ADR 0058/0059/0060/0055/0065/0066, problem P6 — "test the test". The custom design-system
// gates are tested by no one upstream, so a rule that silently stops firing (a bad
// refactor, a dependency bump) would let real violations through behind a green gate.
// This harness plants a known violator for each custom gate, runs the gate, and
// asserts it FAILS (non-zero exit); it restores all state in a `finally`. The harness
// itself exits non-zero if any gate failed to reject its violator — it guards the guards.
//
// SELF-PROVISIONED FIXTURE: the component-coupled gates (#3–#7) build a throwaway,
// otherwise-valid `__gatecheck` primitive quartet (source + design-intent + stories +
// graph node), plant a single defect, and tear it all down — so the self-test stands
// alone and does not depend on any shipped component. In a zero-component template the
// real gates are vacuously green; this harness still proves each rule rejects its
// violator the moment a component exists.

import { execSync } from "node:child_process";
import { writeFileSync, rmSync, mkdirSync, readFileSync } from "node:fs";

let passed = 0;
const failures = [];

/** Run `cmd`; true iff it exited NON-zero — i.e. the gate rejected the violator. */
function rejects(cmd) {
  try {
    execSync(cmd, { stdio: "ignore" });
    return false; // exit 0 → the gate did NOT catch the planted violator
  } catch {
    return true; // non-zero → caught
  }
}

/**
 * Run `cmd`; true iff it exited NON-zero AND its combined output matches `re`.
 * Stronger than `rejects` for a gate that can fail for several reasons at once
 * (Steiger reports every violation it finds): it confirms the SPECIFIC rule we
 * planted a violator for actually fired — not merely that the tool exited
 * non-zero — which is the real P6 guarantee.
 */
function rejectsWith(cmd, re) {
  try {
    execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] });
    return false; // exit 0 → the gate did NOT catch the planted violator
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    return re.test(out);
  }
}

function check(name, run) {
  if (run()) {
    passed++;
    console.log(`  ✓ ${name} — rejected its violator`);
  } else {
    failures.push(name);
    console.error(`  ✗ ${name} — did NOT reject its violator (gate is broken)`);
  }
}

// ── self-provisioned __gatecheck quartet (for the design-system gates) ──────────────
// An otherwise-VALID action-trigger primitive: 12 mandatory states (default demoed,
// the rest justified applicable:false), a play function, no cva/slots/margins. Each
// gate below mutates exactly one facet to plant its defect.
const GC = "__gatecheck";
const GC_SRC = `src/components/ui/${GC}.tsx`;
const GC_INTENT = `src/components/ui/${GC}.design-intent.ts`;
const GC_STORIES = `src/components/ui/${GC}.stories.tsx`;
const GRAPH = "src/design-system/composition-graph.json";

const GC_SRC_BODY = `export function GateCheck(props) {
  return <button type="button" {...props} />;
}
`;

// Plain object (no type imports) so Node's type-stripping import is trivial.
const GC_INTENT_BODY = `export const intent = {
  meta: {
    id: "${GC}",
    kind: "primitive",
    archetype: "action-trigger",
    compositionSignature: [],
    composedOf: [],
    usedIn: [],
  },
  usageRole: null,
  variants: { items: [], traversalComplete: true },
  states: [
    { name: "default", applicable: true, demoStory: "Default" },
    { name: "hover", applicable: false, rationale: "gate fixture" },
    { name: "focus-visible", applicable: false, rationale: "gate fixture" },
    { name: "active", applicable: false, rationale: "gate fixture" },
    { name: "disabled", applicable: false, rationale: "gate fixture" },
    { name: "read-only", applicable: false, rationale: "gate fixture" },
    { name: "min-content", applicable: false, rationale: "gate fixture" },
    { name: "max-content", applicable: false, rationale: "gate fixture" },
    { name: "line-wrap", applicable: false, rationale: "gate fixture" },
    { name: "truncation", applicable: false, rationale: "gate fixture" },
    { name: "cjk", applicable: false, rationale: "gate fixture" },
    { name: "rtl", applicable: false, rationale: "gate fixture" },
  ],
  combinations: { orthogonalAxes: [], allowed: [], forbidden: [] },
  api: { slots: [], variants: [], ownsExternalMargin: false },
  behavior: { refForwarding: false, controlled: "n/a", ariaPassthrough: [] },
  alignment: { alignmentBox: "inline", rhythmSource: "composition-container" },
};
`;

const GC_STORIES_BODY = `import { GateCheck } from "./${GC}";
const meta = { component: GateCheck };
export default meta;
export const Default = { play: async () => {} };
`;

const GC_NODE = {
  id: GC,
  kind: "primitive",
  archetype: "action-trigger",
  module: GC_SRC,
  composedOf: [],
  usedIn: [],
  compositionSignature: [],
};

/**
 * Provision the valid baseline quartet + graph node, run `body` (which may mutate one
 * file/the graph to plant a defect and returns the gate's reject-boolean), then restore
 * everything. `body` receives the helper paths and the pristine graph text.
 */
function withGateCheck(body) {
  const graphOrig = readFileSync(GRAPH, "utf8");
  const graph = JSON.parse(graphOrig);
  graph.nodes.push(GC_NODE);
  mkdirSync("src/components/ui", { recursive: true });
  writeFileSync(GRAPH, `${JSON.stringify(graph, null, 2)}\n`);
  writeFileSync(GC_SRC, GC_SRC_BODY);
  writeFileSync(GC_INTENT, GC_INTENT_BODY);
  writeFileSync(GC_STORIES, GC_STORIES_BODY);
  try {
    return body({ graphOrig });
  } finally {
    writeFileSync(GRAPH, graphOrig);
    rmSync(GC_SRC, { force: true });
    rmSync(GC_INTENT, { force: true });
    rmSync(GC_STORIES, { force: true });
  }
}

const DESIGN_INTENT_CMD =
  "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-design-intent.mjs";

// 1. ESLint token rules (raw color / numbered palette in component source).
check("eslint token rules", () => {
  const f = "src/components/ui/__gatecheck_eslint.tsx";
  mkdirSync("src/components/ui", { recursive: true });
  writeFileSync(
    f,
    'export const x = "#ff0000";\nexport const y = "bg-red-600";\n',
  );
  try {
    return rejects(`npx eslint ${f}`);
  } finally {
    rmSync(f, { force: true });
  }
});

// 2. dependency-cruiser primitive↛composite boundary.
check("dependency-cruiser boundaries", () => {
  const dir = "src/components/__gatecheck";
  const primitive = "src/components/ui/__gatecheck_primitive.tsx";
  mkdirSync(dir, { recursive: true });
  mkdirSync("src/components/ui", { recursive: true });
  writeFileSync(`${dir}/composite.tsx`, "export const C = 1;\n");
  writeFileSync(
    primitive,
    'import { C } from "@/components/__gatecheck/composite";\nexport const x = C;\n',
  );
  try {
    return rejects("npx depcruise src");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(primitive, { force: true });
  }
});

// 3. composition-graph ↔ import reconciliation: a node whose declared `usedIn` cites an
//    importer that does not exist → usedIn drift the gate must reject.
check("composition-graph reconciliation", () =>
  withGateCheck(() => {
    const g = JSON.parse(readFileSync(GRAPH, "utf8"));
    g.nodes
      .find((n) => n.id === GC)
      .usedIn.push("src/app/__gatecheck_fake.tsx");
    writeFileSync(GRAPH, `${JSON.stringify(g, null, 2)}\n`);
    return rejects("node scripts/check-composition-graph.mjs");
  }),
);

// 4. design-intent state coverage (ADR 0062 P8): strip the rationale from a mandatory
//    applicable:false state — a masked omission the gate must reject.
check("design-intent state coverage", () =>
  withGateCheck(() => {
    const orig = readFileSync(GC_INTENT, "utf8");
    const broken = orig.replace(
      '{ name: "hover", applicable: false, rationale: "gate fixture" }',
      '{ name: "hover", applicable: false }',
    );
    if (broken === orig)
      throw new Error(
        "check-gates: could not plant the state-coverage violator",
      );
    writeFileSync(GC_INTENT, broken);
    return rejects(DESIGN_INTENT_CMD);
  }),
);

// 5. design-intent demo coverage (ADR 0062): flip a state to applicable:true
//    with neither demoStory nor demoRationale — a silent story-coverage gap.
check("design-intent demo coverage (states↔stories)", () =>
  withGateCheck(() => {
    const orig = readFileSync(GC_INTENT, "utf8");
    const broken = orig.replace(
      '{ name: "hover", applicable: false, rationale: "gate fixture" }',
      '{ name: "hover", applicable: true }',
    );
    if (broken === orig)
      throw new Error(
        "check-gates: could not plant the demo-coverage violator",
      );
    writeFileSync(GC_INTENT, broken);
    return rejects(DESIGN_INTENT_CMD);
  }),
);

// 6. interactive play coverage (ADR 0038): rename the only `play:` away so an
//    interactive-archetype stories file ships zero play functions.
check("design-intent interactive play coverage", () =>
  withGateCheck(() => {
    const orig = readFileSync(GC_STORIES, "utf8");
    const broken = orig.replace(/\bplay\s*:/, "playDisabled:");
    if (broken === orig)
      throw new Error(
        "check-gates: could not plant the play-coverage violator",
      );
    writeFileSync(GC_STORIES, broken);
    return rejects(DESIGN_INTENT_CMD);
  }),
);

// 7. design-intent demo contradiction (ADR 0062): add a demoRationale beside an
//    existing demoStory — "no story can demo this" next to a story that does.
check("design-intent demo contradiction (demoStory + demoRationale)", () =>
  withGateCheck(() => {
    const orig = readFileSync(GC_INTENT, "utf8");
    const broken = orig.replace(
      'demoStory: "Default"',
      'demoStory: "Default", demoRationale: "cannot be demoed"',
    );
    if (broken === orig)
      throw new Error(
        "check-gates: could not plant the demo-contradiction violator",
      );
    writeFileSync(GC_INTENT, broken);
    return rejects(DESIGN_INTENT_CMD);
  }),
);

// 8. i18n key-parity / ICU (mutate → run → restore).
check("i18n parity / ICU", () => {
  const p = "messages/en.json";
  const orig = readFileSync(p, "utf8");
  const o = JSON.parse(orig);
  o.__gatecheck = { bad: "hello {name" }; // unbalanced ICU brace
  writeFileSync(p, `${JSON.stringify(o, null, 2)}\n`);
  try {
    return rejects("node scripts/check-i18n-parity.mjs");
  } finally {
    writeFileSync(p, orig);
  }
});

// 9. FSD layer boundaries (ADR 0065/0066): a `features` slice importing a
//    `widgets` slice is an upward cross-layer import Steiger must reject. The
//    assertion checks that `fsd/forbidden-imports` fired BY NAME, not merely
//    that Steiger exited non-zero — Steiger can flag several things at once, and
//    P6 is about the specific boundary rule still working.
check("steiger FSD forbidden-imports", () => {
  const widget = "src/widgets/__gatecheck_widget";
  const feature = "src/features/__gatecheck_feature";
  mkdirSync(`${widget}/ui`, { recursive: true });
  mkdirSync(`${feature}/ui`, { recursive: true });
  writeFileSync(
    `${widget}/ui/widget.tsx`,
    "export function GcWidget() {\n  return null;\n}\n",
  );
  writeFileSync(
    `${widget}/index.ts`,
    'export { GcWidget } from "./ui/widget";\n',
  );
  // A feature importing a widget inverts the FSD layer direction.
  writeFileSync(
    `${feature}/ui/feature.tsx`,
    'import { GcWidget } from "@/widgets/__gatecheck_widget";\nexport function GcFeature() {\n  return GcWidget();\n}\n',
  );
  writeFileSync(
    `${feature}/index.ts`,
    'export { GcFeature } from "./ui/feature";\n',
  );
  try {
    return rejectsWith("npx steiger ./src", /fsd\/forbidden-imports/);
  } finally {
    rmSync(widget, { recursive: true, force: true });
    rmSync(feature, { recursive: true, force: true });
  }
});

if (failures.length) {
  console.error(
    `\ncheck-gates: ${failures.length} gate(s) failed to reject their violator — a guarantee is broken (P6).`,
  );
  process.exit(1);
}
console.log(
  `\ncheck-gates: OK — all ${passed} custom design-system / architecture gates correctly reject their violators (P6).`,
);
