#!/usr/bin/env node
// scripts/ds-token-table.mjs
//
// ADR 0058 + Stage 6 (batch-wave/L1, problem P1) — the END-OF-WAVE token-consistency
// table. After a parallel multi-component wave, the cross-component step is to "collect
// all used tokens into a table and find semantic inconsistency (different tokens for one
// visual role)". This tool builds that table from two sources and diffs them:
//   • the design-intent specs   — each StateEntry's declared `tokens` (ADR 0062), and
//   • the component sources      — semantic color utilities (`bg-primary`,
//     `text-muted-foreground`, …) mapped back to their `--color-*` token.
//
// It is advisory (the inconsistency call is a human read of the table, ADR 0046) and
// emits two consistency signals: tokens used in source but NOT declared in the spec
// (spec gap), and tokens declared but not seen in source (stale/aspirational). The
// allowed token names come from the GENERATED registry (tokens.generated.ts) — never a
// hand-list (ADR 0058 single-source, P6).
//
// Usage: npm run ds:tokens-table

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const UI_DIR = join(repoRoot, "src/components/ui");

const tokensMod = await import(
  pathToFileURL(join(repoRoot, "src/design-system/tokens.generated.ts")).href
);
const colorTokens = tokensMod.SEMANTIC_COLOR_TOKENS; // e.g. "--color-primary"
// role → token, e.g. "primary" → "--color-primary", "muted-foreground" → "--color-muted-foreground".
const roleToToken = new Map(
  colorTokens.map((t) => [t.replace("--color-", ""), t]),
);
// Longest roles first so "primary-foreground" wins over "primary".
const roles = [...roleToToken.keys()].sort((a, b) => b.length - a.length);
const UTIL_PREFIXES =
  "bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|divide|accent|caret|placeholder|shadow";

/** Tokens referenced by semantic utilities or `var(--color-*)` in a component source. */
function tokensInSource(src) {
  const found = new Set();
  // var(--color-foo)
  for (const m of src.matchAll(/var\((--color-[\w-]+)\)/g))
    if (roleToToken.has(m[1].replace("--color-", ""))) found.add(m[1]);
  // utility-role, tolerating an opacity suffix (bg-primary/80) and arbitrary value wrappers.
  for (const role of roles) {
    const re = new RegExp(`(?:${UTIL_PREFIXES})-${role}(?![\\w-])`, "g");
    if (re.test(src)) found.add(roleToToken.get(role));
  }
  return found;
}

const perComponent = [];
for (const file of readdirSync(UI_DIR).filter((f) =>
  f.endsWith(".design-intent.ts"),
)) {
  const id = file.replace(".design-intent.ts", "");
  const mod = await import(pathToFileURL(join(UI_DIR, file)).href);
  const intent = Object.values(mod)[0];
  const declared = new Set(intent.states.flatMap((s) => s.tokens ?? []));
  const inSource = tokensInSource(
    readFileSync(join(UI_DIR, `${id}.tsx`), "utf8"),
  );
  perComponent.push({
    id,
    declared,
    inSource,
    all: new Set([...declared, ...inSource]),
  });
}

// ── the table: token → components ───────────────────────────────────────────────────
const tokenToComponents = new Map();
for (const c of perComponent)
  for (const t of c.all) {
    if (!tokenToComponents.has(t)) tokenToComponents.set(t, []);
    tokenToComponents.get(t).push(c.id);
  }

console.log("end-of-wave token-consistency table (ADR 0058 / Stage 6, P1):\n");
console.log("  token                              used by");
console.log(
  "  ---------------------------------  -----------------------------",
);
for (const t of [...tokenToComponents.keys()].sort())
  console.log(
    `  ${t.padEnd(34)} ${tokenToComponents.get(t).sort().join(", ")}`,
  );

// ── consistency signals (spec ↔ source) ─────────────────────────────────────────────
console.log(
  "\nconsistency signals (advisory — a human reads the table for role overlaps):",
);
let signals = 0;
for (const c of perComponent) {
  const specGap = [...c.inSource].filter((t) => !c.declared.has(t));
  const stale = [...c.declared].filter((t) => !c.inSource.has(t));
  if (specGap.length) {
    signals++;
    console.log(
      `  • ${c.id}: used in source but not declared in states[].tokens → ${specGap.join(", ")}`,
    );
  }
  if (stale.length) {
    signals++;
    console.log(
      `  • ${c.id}: declared in the spec but not found in source utilities → ${stale.join(", ")}`,
    );
  }
}
if (!signals)
  console.log("  ✓ every declared token appears in source and vice versa.");

console.log(
  `\nScan the table for one visual ROLE backed by different tokens across components ` +
    `(e.g. a border drawn with --color-border here and --color-input there). That is the ` +
    `semantic inconsistency Stage 6 hunts; the fix is a token choice, recorded once.`,
);
