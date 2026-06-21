#!/usr/bin/env node
// scripts/ds-escalations.mjs
//
// ADR 0061/0062/0046 — the Stage-4 ESCALATION SURFACER (problems P3/P8). Human gates
// are the irreducible layer (intent collisions, state-set deviations); this advisory
// tool finds exactly what needs a 👤 decision and nothing else, so the human reviews
// deviations rather than rubber-stamping 40 identical lists. It NEVER approves — it
// prepares the side-by-side and the agent asks. Exit 0 always (a report, not a gate).
//
// It surfaces three things from the design-intent specs:
//   1. usageRole COLLISIONS (P3) — two components sharing one role: a duplicate vs a
//      deliberate specialization is the human call (ADR 0061, Stage 4).
//   2. state-set DEVIATIONS (P8) — "default once, escalate on deviation": a mandatory
//      archetype state marked `applicable:false`, or a non-mandatory state opted into.
//      A full match auto-approves; only deviations escalate.
//   3. the RUBBER-STAMP METRIC — share of components that auto-approve vs escalate, so
//      the deviation rate is tracked (reduce it by moving FALSE judgment into the
//      deterministic/structural layers, never by weakening a real gate).
//
// Usage: npm run ds:escalations

import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const UI_DIR = join(repoRoot, "src/components/ui");

const states = await import(
  pathToFileURL(join(repoRoot, "src/design-system/states.ts")).href
);
const { STATE_AXES, ARCHETYPE_STATES } = states;

const specs = [];
for (const file of readdirSync(UI_DIR).filter((f) =>
  f.endsWith(".design-intent.ts"),
)) {
  const mod = await import(pathToFileURL(join(UI_DIR, file)).href);
  specs.push(Object.values(mod)[0]);
}

// ── 1. usageRole collisions ────────────────────────────────────────────────────────
const byRole = new Map();
for (const s of specs) {
  if (!s.usageRole) continue;
  if (!byRole.has(s.usageRole)) byRole.set(s.usageRole, []);
  byRole.get(s.usageRole).push(s.meta.id);
}
const collisions = [...byRole].filter(([, ids]) => ids.length > 1);

console.log(
  "usageRole collisions (ADR 0061, P3 — duplicate vs deliberate specialization):",
);
if (!collisions.length) {
  console.log(
    "  ✓ none — every tracked usageRole is held by exactly one component.\n",
  );
} else {
  for (const [role, ids] of collisions) {
    console.log(`  ⚠️  role "${role}" shared by: ${ids.join(", ")}`);
    for (const id of ids) {
      const s = specs.find((x) => x.meta.id === id);
      console.log(
        `        ${id}: archetype=${s.meta.archetype} composedOf=${JSON.stringify(s.meta.composedOf)}`,
      );
    }
  }
  console.log(
    "  → 👤 decide: duplicate (reuse one) or deliberate specialization (record why).\n",
  );
}

// ── 2. state-set deviations + 3. rubber-stamp metric ────────────────────────────────
console.log(
  "state-set deviations (ADR 0061/0062, P8 — escalate on deviation, not per item):",
);
let autoApprove = 0;
let escalate = 0;
const noArchetype = [];

for (const s of specs) {
  const id = s.meta.id;
  if (s.meta.archetype === null) {
    noArchetype.push(id);
    continue;
  }
  const spec = ARCHETYPE_STATES[s.meta.archetype];
  const mandatory = new Set([
    ...spec.mandatoryAxes.flatMap((axis) => STATE_AXES[axis]),
    ...(spec.extraStates ?? []),
  ]);
  const byName = new Map(s.states.map((x) => [x.name, x]));

  const suppressed = [...mandatory].filter(
    (n) => byName.get(n)?.applicable === false,
  );
  const added = s.states
    .filter((x) => x.applicable === true && !mandatory.has(x.name))
    .map((x) => x.name);

  if (!suppressed.length && !added.length) {
    autoApprove++;
    console.log(
      `  ✓ ${id} [${s.meta.archetype}] — matches the default set, auto-approves.`,
    );
  } else {
    escalate++;
    console.log(
      `  ⚠️  ${id} [${s.meta.archetype}] — DEVIATION, needs 👤 review:`,
    );
    for (const n of suppressed)
      console.log(
        `        suppressed mandatory "${n}": ${byName.get(n).rationale}`,
      );
    if (added.length)
      console.log(
        `        added (non-mandatory) applicable: ${added.join(", ")}`,
      );
  }
}
for (const id of noArchetype)
  console.log(
    `  • ${id} — archetype:null (out of the registry; escalates per ADR 0061 if a class is ever wanted).`,
  );

// ── rubber-stamp metric ─────────────────────────────────────────────────────────────
const archetyped = autoApprove + escalate;
const pct = archetyped ? Math.round((escalate / archetyped) * 100) : 0;
console.log(
  `\nrubber-stamp metric (ADR 0062 Stage 4): ${autoApprove}/${archetyped} auto-approve, ` +
    `${escalate}/${archetyped} escalate (${pct}% deviation rate). ` +
    `Reduce the rate only by moving FALSE judgment into the deterministic/structural layers.`,
);
console.log(
  `\nThis is advisory (ADR 0046): the agent presents these; the 👤 human approves. ` +
    `Nothing here blocks a merge.`,
);
