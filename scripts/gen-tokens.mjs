#!/usr/bin/env node
// scripts/gen-tokens.mjs
//
// ADR 0058 — single-source token codegen. The CSS layer in src/app/globals.css
// stays canonical (ADR 0032/0033); this script PARSES it and emits, deterministically:
//   • src/design-system/tokens.generated.ts   — typed semantic-token unions
//   • src/design-system/tokens.allowlist.json  — the flat allowlist the Stage-1
//     stylelint *existence* rule consumes
//   • src/design-system/tokens.agent-rules.md  — the agent-facing token reference
//     (Stage 2): the list the agent and the /check-tokens skill consult, generated
//     so it can never drift from the lint — the "knowledge laundering" guard (P6)
//
// Wired exactly like `gen:types` (ADR 0015): a Node script whose output is run
// through Prettier and drift-checked in CI. NEVER hand-edit the three outputs — edit
// globals.css and re-run `npm run gen:tokens`. One source feeds CSS, types, lint,
// and agent rules, so they cannot drift (problem P6).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = join(repoRoot, "src/app/globals.css");
const OUT_TS = join(repoRoot, "src/design-system/tokens.generated.ts");
const OUT_JSON = join(repoRoot, "src/design-system/tokens.allowlist.json");
const OUT_MD = join(repoRoot, "src/design-system/tokens.agent-rules.md");

/** Bodies of EVERY flat `header { … }` block matched by `re` (capture group 1 = body).
 *  Token blocks carry no nested braces, so `[^}]*` captures a full body; a captured
 *  `{` means that invariant broke — fail loud, the `gen:types` precedent (ADR 0058/0015). */
function blockBodies(css, re) {
  const out = [];
  let m;
  while ((m = re.exec(css)) !== null) {
    if (m[1].includes("{"))
      throw new Error(
        `gen-tokens: nested brace in a token block ('${m[0].slice(0, 32)}…') — flat-block parser invariant broken`,
      );
    out.push(m[1]);
  }
  return out;
}

/** Declared custom-property NAMES in a block (left-hand sides only, deduped + sorted). */
function customProps(body) {
  const names = [];
  const re = /(--[\w-]+)\s*:/g; // a `var(--x)` reference is followed by ')', never ':'
  let m;
  while ((m = re.exec(body)) !== null) names.push(m[1]);
  return [...new Set(names)].sort();
}

// The :root layer is split by prefix (ADR 0081): `--c-*` is the PRIMITIVE layer (raw
// values a tenant swaps, ADR 0082); everything else is the semantic value layer.
const PRIMITIVE_PREFIX = "--c-";
const TENANT_RE = /\[data-tenant[^\]]*\]\s*\{([^}]*)\}/g;
const DENSITY_RE = /\[data-density[^\]]*\]\s*\{([^}]*)\}/g;
const THEME_RE = /\[data-theme[^\]]*\]\s*\{([^}]*)\}/g;
const ROOT_RE = /:root\s*\{([^}]*)\}/g;

/** The `--c-*` primitive names declared across the given :root block bodies. */
function collectPrimitives(rootBodyList) {
  return new Set(
    customProps(rootBodyList.join("\n")).filter((p) =>
      p.startsWith(PRIMITIVE_PREFIX),
    ),
  );
}

/** Swap-only invariant (ADR 0082): a [data-tenant] / [data-density] override block may
 *  ONLY redefine names already declared as `--c-*` primitives — never introduce a new
 *  token, never touch a semantic value-layer / `--color-*` name. Throws to fail the build
 *  (the gen:tokens drift gate exercises this on the real globals.css, so it can't rot). */
function assertSwapOnly(primitives, label, bodies) {
  for (const body of bodies) {
    for (const name of customProps(body)) {
      if (!primitives.has(name)) {
        throw new Error(
          `gen-tokens: ${label} block redefines '${name}', which is not a ${PRIMITIVE_PREFIX}* primitive declared in :root — tenant/density overrides may only swap existing primitives (swap-only invariant, ADR 0082).`,
        );
      }
    }
  }
}

/** `--self-test` (ADR 0078 idiom): prove the swap-only validator on synthetic fixtures —
 *  a valid primitive-only override is accepted, a violating block is rejected. Exits
 *  non-zero on any mismatch (so CI can gate it); never touches the real globals.css. */
function runSelfTest() {
  const okCss = `:root{--c-x:1;--surface-y:var(--c-x);}[data-tenant="t"]{--c-x:2;}`;
  const badCss = `:root{--c-x:1;--surface-y:0;}[data-tenant="t"]{--surface-y:9;}`;
  let ok = true;

  try {
    assertSwapOnly(
      collectPrimitives(blockBodies(okCss, new RegExp(ROOT_RE.source, "g"))),
      "[data-tenant]",
      blockBodies(okCss, new RegExp(TENANT_RE.source, "g")),
    );
  } catch (e) {
    console.error(
      `self-test FAIL: valid primitive-only override rejected — ${e.message}`,
    );
    ok = false;
  }

  let threw = false;
  try {
    assertSwapOnly(
      collectPrimitives(blockBodies(badCss, new RegExp(ROOT_RE.source, "g"))),
      "[data-tenant]",
      blockBodies(badCss, new RegExp(TENANT_RE.source, "g")),
    );
  } catch {
    threw = true;
  }
  if (!threw) {
    console.error(
      "self-test FAIL: a violating override (redefines a non-primitive) was accepted",
    );
    ok = false;
  }

  // The same invariant on the theme selector — the third swap axis (ADR 0092).
  let themeThrew = false;
  try {
    const themeBad = `:root{--c-x:1;--surface-y:0;}[data-theme="light"]{--surface-y:9;}`;
    assertSwapOnly(
      collectPrimitives(blockBodies(themeBad, new RegExp(ROOT_RE.source, "g"))),
      "[data-theme]",
      blockBodies(themeBad, new RegExp(THEME_RE.source, "g")),
    );
  } catch {
    themeThrew = true;
  }
  if (!themeThrew) {
    console.error(
      "self-test FAIL: a violating [data-theme] override (non-primitive) was accepted",
    );
    ok = false;
  }

  if (!ok) process.exit(1);
  console.log(
    "gen-tokens --self-test: swap-only invariant OK (tenant / density / theme)",
  );
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

const css = readFileSync(CSS, "utf8");

// One parse feeds the whole registry: union token NAMES across every @theme /
// @theme inline block, plus color names that appear ONLY under .dark (a Figma
// export's light/dark asymmetry — registered, never fabricated; ADR 0033). The
// :root primitives are the runtime value layer.
const themeBodies = blockBodies(css, /@theme(?:\s+inline)?\s*\{([^}]*)\}/g);
const rootBodies = blockBodies(css, /:root\s*\{([^}]*)\}/g);
const darkBodies = blockBodies(css, /\.dark\s*\{([^}]*)\}/g);
if (themeBodies.length === 0)
  throw new Error(`gen-tokens: no '@theme' block found in ${CSS}`);
if (rootBodies.length === 0)
  throw new Error(`gen-tokens: no ':root' block found in ${CSS}`);

const themeNames = customProps(themeBodies.join("\n")); // semantic + bridge + component
// EVERY color name under .dark — both overrides of light tokens AND truly dark-only
// ones. The Set union below dedups the overrides; the dark-only names (no light
// counterpart) are what this actually contributes (a light/dark-asymmetric export's
// dark-only names — ADR 0033). The name reflects the contents, not a pre-filter: the dedup is load-bearing.
const darkColorNames = customProps(darkBodies.join("\n")).filter((p) =>
  p.startsWith("--color-"),
);
const themeProps = [...new Set([...themeNames, ...darkColorNames])].sort(); // semantic tokens
// Split :root into the --c-* PRIMITIVE layer and the semantic value layer (ADR 0081).
const allRootProps = customProps(rootBodies.join("\n"));
const primitiveProps = allRootProps.filter((p) =>
  p.startsWith(PRIMITIVE_PREFIX),
);
const rootProps = allRootProps.filter((p) => !p.startsWith(PRIMITIVE_PREFIX)); // value layer

// Enforce the swap-only invariant on the REAL file (ADR 0082): tenant/density override
// blocks may only redefine existing primitives. A throw here fails gen:tokens, hence CI.
const primitiveSet = new Set(primitiveProps);
assertSwapOnly(
  primitiveSet,
  "[data-tenant]",
  blockBodies(css, new RegExp(TENANT_RE.source, "g")),
);
assertSwapOnly(
  primitiveSet,
  "[data-density]",
  blockBodies(css, new RegExp(DENSITY_RE.source, "g")),
);
assertSwapOnly(
  primitiveSet,
  "[data-theme]",
  blockBodies(css, new RegExp(THEME_RE.source, "g")),
);

const KNOWN_PREFIXES = ["--color-", "--radius-", "--font-"];
const byPrefix = (prefix) => themeProps.filter((p) => p.startsWith(prefix));
const colorTokens = byPrefix("--color-");
const radiusTokens = byPrefix("--radius-");
const fontTokens = byPrefix("--font-");
// A new @theme namespace surfaces as an explicit diff rather than being dropped.
const otherTokens = themeProps.filter(
  (p) => !KNOWN_PREFIXES.some((k) => p.startsWith(k)),
);
const semanticAll = [
  ...new Set([...colorTokens, ...radiusTokens, ...fontTokens, ...otherTokens]),
].sort();

const constArray = (name, items) =>
  `export const ${name} = [\n${items.map((i) => `  "${i}",`).join("\n")}\n] as const;`;

const banner = `// AUTO-GENERATED by scripts/gen-tokens.mjs — DO NOT EDIT.
// Source of truth: src/app/globals.css (\`@theme inline\` + \`:root\`). ADR 0058/0032/0033.
// Regenerate with \`npm run gen:tokens\`; CI fails on drift (like gen:types, ADR 0015).`;

const ts = `${banner}

/** Semantic COLOR tokens — \`@theme\` keys that back utilities like \`bg-primary\`. */
${constArray("SEMANTIC_COLOR_TOKENS", colorTokens)}
export type SemanticColorToken = (typeof SEMANTIC_COLOR_TOKENS)[number];

/** Semantic RADIUS tokens — back \`rounded-*\` utilities. */
${constArray("SEMANTIC_RADIUS_TOKENS", radiusTokens)}
export type SemanticRadiusToken = (typeof SEMANTIC_RADIUS_TOKENS)[number];

/** Semantic FONT tokens — back \`font-*\` utilities. */
${constArray("SEMANTIC_FONT_TOKENS", fontTokens)}
export type SemanticFontToken = (typeof SEMANTIC_FONT_TOKENS)[number];
${
  otherTokens.length
    ? `
/** Other \`@theme\` tokens outside the known namespaces. */
${constArray("SEMANTIC_OTHER_TOKENS", otherTokens)}
export type SemanticOtherToken = (typeof SEMANTIC_OTHER_TOKENS)[number];
`
    : ""
}
/** Every semantic token a component may reference by name (the registry union). */
${constArray("SEMANTIC_TOKENS", semanticAll)}
export type SemanticToken = (typeof SEMANTIC_TOKENS)[number];

/** Runtime \`:root\` variables the \`@theme\` tokens alias (the value layer). */
${constArray("THEME_VARIABLES", rootProps)}
export type ThemeVariable = (typeof THEME_VARIABLES)[number];

/** The \`--c-*\` PRIMITIVE layer (ADR 0081) — raw values a tenant swaps (ADR 0082),
 *  split out of \`:root\` by prefix. Components never reference these directly. */
${constArray("PRIMITIVE_VARIABLES", primitiveProps)}
export type PrimitiveVariable = (typeof PRIMITIVE_VARIABLES)[number];
`;

const allowlist = {
  $generatedBy:
    "scripts/gen-tokens.mjs (ADR 0058) — do not hand-edit; run `npm run gen:tokens`",
  semanticTokens: semanticAll,
  themeVariables: rootProps,
  primitiveVariables: primitiveProps,
};

// Agent-facing reference (Stage 2, problem P6). The bare `stem` is the Tailwind
// utility suffix the token backs (`--color-primary` → `bg-primary`/`text-primary`).
const stem = (token, prefix) => token.slice(prefix.length);
const mdSection = (heading, tokens, prefix) =>
  tokens.length
    ? `## ${heading} (${tokens.length})\n\n${tokens
        .map((t) => `- \`${t}\` → \`${stem(t, prefix)}\``)
        .join("\n")}\n`
    : "";

const md = `<!-- AUTO-GENERATED by scripts/gen-tokens.mjs (ADR 0058) — DO NOT EDIT.
     Source of truth: src/app/globals.css (\`@theme inline\` + \`:root\`).
     Regenerate: \`npm run gen:tokens\`. CI fails on drift (like gen:types, ADR 0015). -->

# Allowed design tokens — agent reference (generated)

The **single source** for _which_ tokens exist, generated from the same
\`@theme\`/\`:root\` parse that feeds the Stage-1 lint allowlist
(\`tokens.allowlist.json\`) and the typed union (\`tokens.generated.ts\`). Agent rules
and the \`/check-tokens\` skill point here; they never re-list tokens in prose — the
"knowledge laundering" guard (problem P6, ADR 0058).

## Rules (ESLint-enforced in \`src/components/**\` — ADR 0058/0033)

- Use **only** the semantic tokens below — via their Tailwind utilities
  (\`bg-primary\`, \`text-muted-foreground\`, \`rounded-lg\`) or \`var(--color-*)\`.
- **Banned** in components: raw hex (\`#0f172a\`), CSS color functions
  (\`oklch(...)\`, \`rgb(...)\`), inline-\`style\` raw color values, raw SVG
  \`fill\`/\`stroke\` color literals, and Tailwind's numbered palette (\`bg-zinc-900\`,
  \`text-red-500\`).
- A primitive owns **no external margin** — spacing is the composing parent's job.
- Light/dark is a semantic-variable override (\`.dark\`), never a different token.

${mdSection("Semantic color tokens — back `bg-*` / `text-*` / `border-*` / `ring-*`", colorTokens, "--color-")}
${mdSection("Semantic radius tokens — back `rounded-*`", radiusTokens, "--radius-")}
${mdSection("Semantic font tokens — back `font-*`", fontTokens, "--font-")}${
  otherTokens.length
    ? `\n${mdSection("Other `@theme` tokens", otherTokens, "--")}`
    : ""
}`;

mkdirSync(dirname(OUT_TS), { recursive: true });
writeFileSync(OUT_TS, ts, "utf8");
writeFileSync(OUT_JSON, `${JSON.stringify(allowlist, null, 2)}\n`, "utf8");
writeFileSync(OUT_MD, md, "utf8");

console.log(
  `gen-tokens: ${semanticAll.length} semantic tokens ` +
    `(${colorTokens.length} color, ${radiusTokens.length} radius, ${fontTokens.length} font` +
    `${otherTokens.length ? `, ${otherTokens.length} other` : ""}), ` +
    `${rootProps.length} value-layer + ${primitiveProps.length} primitive variables ` +
    `→ tokens.generated.ts + tokens.allowlist.json + tokens.agent-rules.md`,
);
