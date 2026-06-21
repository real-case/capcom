#!/usr/bin/env node
// scripts/check-design-intent.mjs
//
// ADR 0062 — the `design-intent.ts` fitness functions (the Stage-1 DETERMINISTIC half
// that was deferred until the spec existed). Each component under src/components/ui that
// is a composition-graph node ships a colocated `<name>.design-intent.ts`; this gate
// proves the spec has not drifted from reality, on five axes:
//
//   1. completeness + meta↔graph  — every node has a spec and vice versa; the spec's
//      `meta` (kind/archetype/composedOf/usedIn/compositionSignature) matches the
//      composition graph exactly (ADR 0059/0060, problem P9).
//   2. api↔props (ADR 0062, P4/P5) — declared `api.variants` matches the component's
//      REAL closed axes (cva `variants` block + inline string-literal-union props);
//      declared `api.slots` correspond to real slots (`asChild`, `children`, data-slot);
//      `ownsExternalMargin:false` is backed by no external-margin utility in the source
//      (ADR 0058 "a primitive owns no external margin").
//   3. state coverage by subtraction (ADR 0061/0062, P8) — every mandatory-axis state
//      (+ archetype-specific states) for the component's archetype appears as a
//      StateEntry; an `applicable:false` WITHOUT a rationale is a masked omission → fail.
//   4. states↔stories, BOTH directions (ADR 0062) — an
//      `applicable:true` state needs a `demoStory` XOR a non-empty `demoRationale`
//      (coverage direction; both at once is a contradictory record); a set
//      `demoStory` must exist in the colocated stories file (no stale link); a story
//      `tags: ["state:X"]` for an undeclared X is contract expansion → fail.
//   5. interactive play coverage (ADR 0038) — a component whose
//      archetype mandates the `interaction` axis (derived from ARCHETYPE_STATES at
//      runtime, single-source) must ship at least one `play` function in its stories.
//      Conditional interaction axes (e.g. categorical-indicator's "interactive
//      variant") are deliberately excluded — requiring play there would false-positive
//      on purely presentational uses.
//
// Reads the ratified registry (states.ts) and each spec directly via Node 24 type-
// stripping — those files ARE the machine-readable sources of truth (no second copy to
// drift). Wired into CI beside the other check:* gates and self-tested by check:gates.
//
// `--component <id>` scopes the run to one component's quartet (spec ↔ source ↔
// stories), skipping the corpus-completeness pass — the fast path for the post-edit
// hook and the story-authoring skills. CI always runs unscoped.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const GRAPH = join(repoRoot, "src/design-system/composition-graph.json");
const UI_DIR = join(repoRoot, "src/components/ui");

const states = await import(
  pathToFileURL(join(repoRoot, "src/design-system/states.ts")).href
);
const { STATE_AXES, ARCHETYPE_STATES } = states;

// --component <id>: scope to one component's quartet (hook / skill fast path).
const onlyIdx = process.argv.indexOf("--component");
const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;
if (onlyIdx !== -1 && !only) {
  console.error("check-design-intent: --component requires a component id.");
  process.exit(1);
}

// Archetypes whose MANDATORY axes include `interaction` require a play function
// (fitness #5). Derived from the ratified registry at runtime — never re-listed.
const interactiveArchetypes = new Set(
  Object.entries(ARCHETYPE_STATES)
    .filter(([, spec]) => spec.mandatoryAxes.includes("interaction"))
    .map(([name]) => name),
);

const errors = [];
const fail = (id, msg) => errors.push(`[${id}] ${msg}`);
const sortedEq = (a, b) =>
  a.length === b.length &&
  [...a].sort().every((x, i) => [...b].sort()[i] === x);

// ── tiny TS-source parsers (enough for the 4 real primitives; tolerant by design) ──

/** The balanced `{...}` substring starting at the `{` at `startIdx`. */
function balanced(src, startIdx) {
  let depth = 0;
  for (let i = startIdx; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(startIdx, i + 1);
  }
  return null;
}

/** Top-level `key: value` entries of an object-literal block (incl. its braces). */
function objectEntries(block) {
  const inner = block.slice(block.indexOf("{") + 1, block.lastIndexOf("}"));
  const out = [];
  let i = 0;
  const n = inner.length;
  while (i < n) {
    while (i < n && /[\s,]/.test(inner[i])) i++;
    if (i >= n) break;
    let key;
    if (inner[i] === '"' || inner[i] === "'") {
      const q = inner[i];
      let j = i + 1;
      while (j < n && inner[j] !== q) j++;
      key = inner.slice(i + 1, j);
      i = j + 1;
    } else {
      let j = i;
      while (j < n && /[A-Za-z0-9_$-]/.test(inner[j])) j++;
      key = inner.slice(i, j);
      i = j;
    }
    while (i < n && inner[i] !== ":") i++;
    i++;
    while (i < n && /\s/.test(inner[i])) i++;
    let value;
    if (inner[i] === "{") {
      value = balanced(inner, i) ?? "";
      i += value.length;
    } else {
      let j = i;
      let d = 0;
      let q = null;
      for (; j < n; j++) {
        const c = inner[j];
        if (q) {
          if (c === q && inner[j - 1] !== "\\") q = null;
          continue;
        }
        if (c === '"' || c === "'" || c === "`") q = c;
        else if ("{[(".includes(c)) d++;
        else if ("}])".includes(c)) d--;
        else if (c === "," && d === 0) break;
      }
      value = inner.slice(i, j);
      i = j;
    }
    if (key) out.push({ key, value });
  }
  return out;
}

/** Closed axes declared via cva: { axisName: [sorted value keys] }. */
function cvaAxes(src) {
  const cvaIdx = src.indexOf("cva(");
  if (cvaIdx === -1) return {};
  const vKey = src.indexOf("variants:", cvaIdx);
  if (vKey === -1) return {};
  const block = balanced(src, src.indexOf("{", vKey));
  if (!block) return {};
  const axes = {};
  for (const { key, value } of objectEntries(block)) {
    if (value.trimStart().startsWith("{"))
      axes[key] = objectEntries(value)
        .map((e) => e.key)
        .sort();
  }
  return axes;
}

/** Values of an inline string-literal-union prop, e.g. `size?: "default" | "sm"`. */
function inlineUnion(src, prop) {
  const m = src.match(
    new RegExp(`\\b${prop}\\??\\s*:\\s*((?:"[^"]*"\\s*\\|?\\s*)+)`),
  );
  if (!m) return null;
  return [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]).sort();
}

/** External-margin Tailwind utilities (ADR 0058 — a primitive owns no external margin). */
function externalMargins(src) {
  const m = src.match(/(?<![\w-])-?m[trblxy]?-(?:\d|px|auto|\[)/g);
  return m ? [...new Set(m)] : [];
}

/** Exported story names, tags, and play presence from a colocated stories file. */
function readStories(storyPath) {
  if (!existsSync(storyPath))
    return { exists: false, exports: [], stateTags: [], hasPlay: false };
  const src = readFileSync(storyPath, "utf8");
  const exports = [...src.matchAll(/export const (\w+)\s*[:=]/g)].map(
    (m) => m[1],
  );
  const stateTags = [...src.matchAll(/["']state:([\w-]+)["']/g)].map(
    (m) => m[1],
  );
  return { exists: true, exports, stateTags, hasPlay: /\bplay\s*:/.test(src) };
}

// ── load the graph + every spec ──────────────────────────────────────────────────

const graph = JSON.parse(readFileSync(GRAPH, "utf8"));
const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

// Completeness: every *.design-intent.ts maps to a node, and every node has a spec.
// Skipped in --component mode (a quartet-local check; the corpus pass is CI's job).
const intentFiles = readdirSync(UI_DIR).filter((f) =>
  f.endsWith(".design-intent.ts"),
);
let intentIds = new Set(
  intentFiles.map((f) => f.replace(".design-intent.ts", "")),
);
if (only) {
  if (!intentIds.has(only)) {
    console.error(
      `check-design-intent: no ${only}.design-intent.ts under src/components/ui.`,
    );
    process.exit(1);
  }
  intentIds = new Set([only]);
} else {
  for (const id of intentIds)
    if (!nodeById.has(id))
      fail(
        id,
        `design-intent has no matching composition-graph node (ADR 0059).`,
      );
  for (const node of graph.nodes)
    if (!intentIds.has(node.id))
      fail(
        node.id,
        `composition-graph node has no colocated design-intent.ts (ADR 0062 DoR).`,
      );
}

for (const id of intentIds) {
  const node = nodeById.get(id);
  if (!node) continue;
  const mod = await import(
    pathToFileURL(join(UI_DIR, `${id}.design-intent.ts`)).href
  );
  const intent = Object.values(mod)[0];
  const src = readFileSync(join(UI_DIR, `${id}.tsx`), "utf8");
  const stories = readStories(join(UI_DIR, `${id}.stories.tsx`));

  // 1. meta ↔ graph.
  const meta = intent.meta;
  if (meta.id !== id) fail(id, `meta.id "${meta.id}" ≠ file name "${id}".`);
  if (meta.kind !== node.kind)
    fail(id, `meta.kind "${meta.kind}" ≠ graph kind "${node.kind}".`);
  if (meta.archetype !== node.archetype)
    fail(
      id,
      `meta.archetype "${meta.archetype}" ≠ graph archetype "${node.archetype}".`,
    );
  if (!sortedEq(meta.composedOf, node.composedOf))
    fail(id, `meta.composedOf ≠ graph composedOf.`);
  if (!sortedEq(meta.usedIn, node.usedIn))
    fail(
      id,
      `meta.usedIn drift vs graph:\n    spec:  ${JSON.stringify([...meta.usedIn].sort())}\n    graph: ${JSON.stringify([...node.usedIn].sort())}`,
    );
  const sigExpected = [...new Set(meta.composedOf)].sort();
  if (!sortedEq(meta.compositionSignature, sigExpected))
    fail(
      id,
      `meta.compositionSignature ≠ sorted unique composedOf (v1, ADR 0059).`,
    );

  // 2. api ↔ props.
  if (intent.api.ownsExternalMargin !== false)
    fail(id, `api.ownsExternalMargin must be false (ADR 0058).`);
  const margins = externalMargins(src);
  if (margins.length)
    fail(
      id,
      `api.ownsExternalMargin:false but external-margin utilities found in ${id}.tsx: ${margins.join(", ")} (ADR 0058).`,
    );

  const cva = cvaAxes(src);
  const declaredVariants = new Map(
    intent.api.variants.map((v) => [v.prop, [...v.values].sort()]),
  );
  // every real cva axis must be declared (no missing axis)…
  for (const [axis, values] of Object.entries(cva)) {
    if (!declaredVariants.has(axis))
      fail(
        id,
        `cva axis "${axis}" exists in ${id}.tsx but is not in api.variants (P4 under-spec).`,
      );
    else if (!sortedEq(declaredVariants.get(axis), values))
      fail(
        id,
        `api.variants["${axis}"] ≠ cva values:\n    spec: ${JSON.stringify(declaredVariants.get(axis))}\n    cva:  ${JSON.stringify(values)}`,
      );
  }
  // …and every declared variant must exist in the source (no hallucinated axis).
  for (const [prop, values] of declaredVariants) {
    if (cva[prop]) continue; // already reconciled above
    const union = inlineUnion(src, prop);
    if (!union)
      fail(
        id,
        `api.variants declares "${prop}" but no cva axis or inline union for it exists in ${id}.tsx (P4 hallucination).`,
      );
    else if (!sortedEq(values, union))
      fail(
        id,
        `api.variants["${prop}"] ≠ inline union:\n    spec:   ${JSON.stringify(values)}\n    source: ${JSON.stringify(union)}`,
      );
  }
  // slots: declared slots must have a basis; a real `asChild` slot must be declared.
  const slotNames = new Set(intent.api.slots.map((s) => s.name));
  for (const s of intent.api.slots) {
    if (s.name === "children") continue;
    if (!new RegExp(`\\b${s.name}\\b`).test(src))
      fail(
        id,
        `api.slots declares "${s.name}" but no matching prop/slot exists in ${id}.tsx.`,
      );
    if (!s.rationale?.trim())
      fail(
        id,
        `api.slots["${s.name}"] needs a slot-vs-variant rationale (ADR 0062 P5).`,
      );
  }
  if (/\basChild\b/.test(src) && !slotNames.has("asChild"))
    fail(
      id,
      `${id}.tsx has an \`asChild\` slot not recorded in api.slots (ADR 0062 P5).`,
    );

  // 3. state coverage by subtraction.
  const declaredStates = new Map(intent.states.map((s) => [s.name, s]));
  if (node.archetype !== null) {
    const spec = ARCHETYPE_STATES[node.archetype];
    const required = [
      ...spec.mandatoryAxes.flatMap((axis) => STATE_AXES[axis]),
      ...(spec.extraStates ?? []),
    ];
    for (const stateName of required)
      if (!declaredStates.has(stateName))
        fail(
          id,
          `missing mandatory state "${stateName}" for archetype "${node.archetype}" (ADR 0061/0062 P8 — cover it or mark applicable:false + rationale).`,
        );
  }
  for (const s of intent.states) {
    if (s.applicable === false && !s.rationale?.trim())
      fail(
        id,
        `state "${s.name}" is applicable:false without a rationale — masked omission (ADR 0062 P8).`,
      );
  }

  // 4. states ↔ stories, both directions (ADR 0062).
  for (const s of intent.states) {
    if (s.demoStory && !stories.exports.includes(s.demoStory))
      fail(
        id,
        `state "${s.name}" demoStory "${s.demoStory}" is not an export of ${id}.stories.tsx (stale link).`,
      );
    if (s.applicable === true && !s.demoStory && !s.demoRationale?.trim())
      fail(
        id,
        `state "${s.name}" is applicable:true with neither demoStory nor demoRationale — a silent story-coverage gap (ADR 0062).`,
      );
    if (s.demoStory && s.demoRationale?.trim())
      fail(
        id,
        `state "${s.name}" carries BOTH demoStory and demoRationale — a contradictory record ("no story can demo this" next to a story that does); keep exactly one (ADR 0062).`,
      );
  }
  for (const tag of stories.stateTags)
    if (!declaredStates.has(tag))
      fail(
        id,
        `story tag "state:${tag}" references a state not declared in the design-intent (contract expansion).`,
      );

  // 5. interactive play coverage (ADR 0038): an interactive archetype must
  //    drive its UI in at least one play function (ADR 0038).
  if (
    node.archetype !== null &&
    interactiveArchetypes.has(node.archetype) &&
    stories.exists &&
    !stories.hasPlay
  )
    fail(
      id,
      `archetype "${node.archetype}" mandates the interaction axis but ${id}.stories.tsx has no play function (ADR 0038).`,
    );
}

if (errors.length) {
  console.error(
    `design-intent: ${errors.length} problem(s) — a spec has drifted from the graph, the props, or the archetype set (ADR 0062):`,
  );
  for (const e of errors) console.error(`  • ${e}`);
  console.error(
    `\nFix the spec or the code, then re-run: npm run check:design-intent`,
  );
  process.exit(1);
}
console.log(
  `design-intent: OK — ${intentIds.size} spec(s) reconciled against the graph, props, archetype state sets, and stories (ADR 0062).`,
);
