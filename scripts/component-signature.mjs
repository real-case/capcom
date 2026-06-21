#!/usr/bin/env node
// scripts/component-signature.mjs
//
// ADR 0059 — composition-signature check (problem P2: structural duplication of
// components via isomorphic composition). This is a STAGE-2 advisory tool, not a CI
// gate: it runs inside the agent's own loop, BEFORE a new component is created, to
// reduce the chance of building a second component that is structurally the same as
// one that already exists. The guarantee stays in Stage 1 (this layer is
// recall-over-precision, ADR 0059/0064).
//
// Signature v1 (ADR 0059): the normalized *set* of composed primitive ids — NO
// topology (subtree isomorphism is nontrivial and fuzzy matching yields false
// positives; add topology only if the Defect Log shows confirmed omissions, ADR 0064).
// The usage-role / archetype *adjacency amplifier* raises recall for the leaf case
// where the composed-set alone can't discriminate (two distinct primitives both have
// an empty set).
//
// Usage:
//   node scripts/component-signature.mjs                       # report all node signatures
//   node scripts/component-signature.mjs --id <existing-id>    # classify an existing node vs the rest
//   node scripts/component-signature.mjs --composed-of a,b,c --archetype container [--role action-trigger] [--name foo]
//
// Exit code: 1 if an exact structural DUPLICATE is found (a loud "reuse, don't
// create" signal for the agent loop); 0 otherwise (candidates print as warnings).
// Not wired into CI — advisory by design.

import { readFileSync } from "node:fs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) args[a.slice(2)] = argv[++i] ?? true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
// `--graph` overrides the source (used by the test fixtures); defaults to the real graph.
const GRAPH =
  typeof args.graph === "string"
    ? args.graph
    : "src/design-system/composition-graph.json";
const graph = JSON.parse(readFileSync(GRAPH, "utf8"));

/** Normalized v1 signature: the sorted, de-duplicated set of composed primitive ids. */
const signatureOf = (composedOf) => [...new Set(composedOf)].sort();
const fmtSet = (s) =>
  s.length ? `{ ${s.join(", ")} }` : "{ } (leaf primitive)";

// ───────────────────────────────────────────────────────────────────────────────
// DECISION POINT (you) — the candidate-duplicate heuristic.
//
// This single function sets how aggressively the tool flags a proposed component as
// overlapping an existing one. It is the recall/precision knob for the whole
// structural layer, and it is a genuine design judgment (multiple valid approaches),
// so it is yours to shape — see the request in the chat. The rest of this script
// (parsing, the graph walk, reporting, exit codes) is built around it.
//
//   proposed: { composedOf: string[] (sorted), archetype: string|null, role: string|null }
//   existing: a composition-graph node { id, kind, archetype, composedOf, ... }
//   → return "duplicate" | "candidate" | "distinct"
//
// Contract the rest of the script relies on:
//   • "duplicate"  → exact same structure; the agent must REUSE, not create (exit 1).
//   • "candidate"  → close enough to need a human look before creating (problem P2);
//                    a duplicate vs. a deliberate specialization is the Stage-4 call.
//   • "distinct"   → no meaningful overlap; clear to create.
//
// Shipped default below is deliberately CONSERVATIVE (precision-first): only an exact
// match of a NON-EMPTY composed set is a duplicate; everything else is distinct. That
// is correct but has zero recall on leaf primitives (every leaf has the empty set),
// which is exactly the gap the ADR-0059 "adjacency amplifier" is meant to close.
//
// TODO(you): add the amplifier — return "candidate" using the adjacency signal. The
// graph carries `archetype` today; `usageRole` materializes on nodes in Stage 3
// (design-intent.ts) and is the stronger signal once present. Approaches to weigh:
//   • same archetype (and/or role) → "candidate"            — simple, higher recall
//   • same archetype + composed-set overlap (Jaccard ≥ k)   — fewer false positives
//   • same archetype + subset/superset of the composed set  — catches "X plus one slot"
// Pick the trade-off that matches how often you want the agent to pause and escalate.
function classifyCandidate(proposed, existing) {
  const a = proposed.composedOf;
  const b = signatureOf(existing.composedOf);
  const sameSet = a.length === b.length && a.every((x, i) => x === b[i]);
  if (sameSet && a.length > 0) return "duplicate";

  // TODO(you): the adjacency amplifier goes here (return "candidate" when close).

  return "distinct";
}
// ───────────────────────────────────────────────────────────────────────────────

function classifyAgainstGraph(proposed, selfId) {
  const results = { duplicate: [], candidate: [] };
  for (const node of graph.nodes) {
    if (node.id === selfId) continue;
    const verdict = classifyCandidate(proposed, node);
    if (verdict === "duplicate") results.duplicate.push(node);
    else if (verdict === "candidate") results.candidate.push(node);
  }
  return results;
}

function reportVerdict(proposed, selfId, label) {
  console.log(`\n${label}`);
  console.log(`  signature v1: ${fmtSet(proposed.composedOf)}`);
  console.log(
    `  archetype: ${proposed.archetype ?? "—"}   role: ${proposed.role ?? "—"}`,
  );
  const { duplicate, candidate } = classifyAgainstGraph(proposed, selfId);

  if (duplicate.length) {
    console.error(
      `\n⛔ structural DUPLICATE of: ${duplicate.map((n) => n.id).join(", ")}`,
    );
    console.error(
      `   Do not create a new component — reuse the existing one (ADR 0059, P2).`,
    );
    return 1;
  }
  if (candidate.length) {
    console.warn(
      `\n⚠️  ${candidate.length} candidate(s) worth a look: ${candidate
        .map((n) => `${n.id} [${n.archetype ?? "—"}]`)
        .join(", ")}`,
    );
    console.warn(
      `   Check each before creating: a duplicate vs. a deliberate specialization is` +
        `\n   the human call (Stage 4, ADR 0061). If deliberate, proceed and record why.`,
    );
    return 0;
  }
  console.log(`\n✓ no structural match — clear to create.`);
  return 0;
}

// Mode 1: no args → report every node's signature (a readable inventory).
if (!args["composed-of"] && !args.id) {
  console.log(
    `composition signatures (v1 = composed-primitive set), from ${GRAPH}:`,
  );
  for (const node of graph.nodes) {
    console.log(
      `  ${node.id.padEnd(10)} ${node.kind.padEnd(10)} ${(node.archetype ?? "—").padEnd(20)} ${fmtSet(
        signatureOf(node.composedOf),
      )}`,
    );
  }
  console.log(
    `\nTo check a proposed component:\n  npm run ds:signature -- --composed-of a,b --archetype container [--role action-trigger]`,
  );
  process.exit(0);
}

// Mode 2: --id <existing> → classify an existing node against the rest (find dupes already in the graph).
if (args.id) {
  const node = graph.nodes.find((n) => n.id === args.id);
  if (!node) {
    console.error(`no node "${args.id}" in ${GRAPH}`);
    process.exit(2);
  }
  const proposed = {
    composedOf: signatureOf(node.composedOf),
    archetype: node.archetype,
    role: node.usageRole ?? null,
  };
  process.exit(reportVerdict(proposed, node.id, `existing node "${node.id}":`));
}

// Mode 3: a proposed component described on the CLI.
const proposed = {
  composedOf: signatureOf(
    String(args["composed-of"] === true ? "" : args["composed-of"])
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ),
  archetype: typeof args.archetype === "string" ? args.archetype : null,
  role: typeof args.role === "string" ? args.role : null,
};
process.exit(
  reportVerdict(
    proposed,
    null,
    `proposed component "${args.name ?? "(unnamed)"}":`,
  ),
);
