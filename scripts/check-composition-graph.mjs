#!/usr/bin/env node
// scripts/check-composition-graph.mjs
//
// ADR 0059/0060 — the code side of the anti-drift reconciliation (problem P9). The
// composition graph is the top-down *intent* model; this script verifies the
// *implementation* has not diverged from it, the same generate-then-assert-no-drift
// discipline as gen:types (ADR 0015). It checks, with no third-party dependency:
//   1. structural integrity of composition-graph.json (required fields, kind enum,
//      archetype in the controlled vocabulary or null);
//   2. every src/components/ui component module appears as a node;
//   3. each node's declared `usedIn` and `composedOf` match the real import graph
//      (a mismatch fails — forcing an update of either the graph or the code).
//
// The full module-boundary gate (primitive↛composite, public-API, no-circular) is the
// dependency-cruiser half of ADR 0060; this script is the graph↔code reconciliation.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const GRAPH = "src/design-system/composition-graph.json";
const ARCHETYPES_TS = "src/design-system/archetypes.ts";
const UI_DIR = "src/components/ui";

const errors = [];
const fail = (msg) => errors.push(msg);

/** The controlled archetype vocabulary, read from its single source (ADR 0061). */
function readArchetypes() {
  const text = readFileSync(ARCHETYPES_TS, "utf8");
  const block = text.match(
    /export const ARCHETYPES = \[([\s\S]*?)\] as const;/,
  );
  if (!block)
    throw new Error(`could not parse ARCHETYPES from ${ARCHETYPES_TS}`);
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Repo-relative source files under a dir, excluding tests, stories, snapshots. */
function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__snapshots__") continue;
      out.push(...sourceFiles(full));
    } else if (
      /\.(ts|tsx)$/.test(entry) &&
      !/\.(test|stories)\.(ts|tsx)$/.test(entry) &&
      !/\.snapshot\.test\.(ts|tsx)$/.test(entry) &&
      !/\.design-intent\.ts$/.test(entry)
    ) {
      // `*.design-intent.ts` is the ADR-0062 SPEC beside a component, not a component
      // module — it has no graph node of its own (it describes one). Reconciled
      // separately by check:design-intent.
      out.push(full);
    }
  }
  return out;
}

/** Module paths (excluding `self`) that import the ui component `id`. */
function importersOf(id, allFiles, self) {
  const ref = new RegExp(`components/ui/${id}["'/]`);
  return allFiles
    .filter((f) => f !== self && ref.test(readFileSync(f, "utf8")))
    .sort();
}

const archetypes = readArchetypes();
const graph = JSON.parse(readFileSync(GRAPH, "utf8"));
const allSrc = sourceFiles("src");

// 1. Structural integrity.
if (graph.version !== 1) fail(`graph version must be 1, got ${graph.version}`);
const ids = new Set();
for (const node of graph.nodes ?? []) {
  const where = `node "${node.id ?? "?"}"`;
  for (const field of [
    "id",
    "kind",
    "archetype",
    "module",
    "composedOf",
    "usedIn",
    "compositionSignature",
  ]) {
    if (!(field in node)) fail(`${where}: missing required field "${field}"`);
  }
  if (ids.has(node.id)) fail(`${where}: duplicate id`);
  ids.add(node.id);
  if (!["primitive", "composite", "pattern"].includes(node.kind))
    fail(`${where}: bad kind "${node.kind}"`);
  if (node.archetype !== null && !archetypes.includes(node.archetype))
    fail(
      `${where}: archetype "${node.archetype}" not in the controlled vocabulary (ADR 0061)`,
    );
  if (!existsSync(node.module))
    fail(`${where}: module ${node.module} does not exist`);
}

// 2. Every ui component module is a node.
const moduleToId = new Map(graph.nodes.map((n) => [n.module, n.id]));
for (const file of sourceFiles(UI_DIR)) {
  if (!moduleToId.has(file))
    fail(`component ${file} has no node in ${GRAPH} (ADR 0059 completeness)`);
}

// 3. Reconcile usedIn + composedOf against the real import graph.
const sameSet = (a, b) =>
  a.length === b.length && a.every((x, i) => x === b[i]);
for (const node of graph.nodes) {
  const actualUsedIn = importersOf(node.id, allSrc, node.module);
  const declaredUsedIn = [...node.usedIn].sort();
  if (!sameSet(actualUsedIn, declaredUsedIn)) {
    fail(
      `node "${node.id}": usedIn drift —\n    declared: ${JSON.stringify(declaredUsedIn)}\n    actual:   ${JSON.stringify(actualUsedIn)}`,
    );
  }
  const ownImports = readFileSync(node.module, "utf8");
  const actualComposedOf = graph.nodes
    .filter(
      (other) =>
        other.id !== node.id &&
        new RegExp(`components/ui/${other.id}["'/]`).test(ownImports),
    )
    .map((other) => other.id)
    .sort();
  const declaredComposedOf = [...node.composedOf].sort();
  if (!sameSet(actualComposedOf, declaredComposedOf)) {
    fail(
      `node "${node.id}": composedOf drift —\n    declared: ${JSON.stringify(declaredComposedOf)}\n    actual:   ${JSON.stringify(actualComposedOf)}`,
    );
  }
}

if (errors.length) {
  console.error(
    `composition-graph: ${errors.length} problem(s) — graph and code have drifted (ADR 0059/0060):`,
  );
  for (const e of errors) console.error(`  • ${e}`);
  console.error(
    `\nFix the code, or update ${GRAPH} to match. Re-run: npm run check:graph`,
  );
  process.exit(1);
}
console.log(
  `composition-graph: OK — ${graph.nodes.length} node(s) reconciled against the import graph.`,
);
