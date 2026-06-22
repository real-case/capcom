#!/usr/bin/env node
// scripts/check-contrast.mjs
//
// `check:contrast` — the computed accessibility fitness function for the mission-control
// token vocabulary (ADR 0081, Confirmation; the reactive-growth posture of ADR 0064).
//
// The brief makes status-contrast and a readable text hierarchy non-negotiable. This gate
// turns that from "asserted in review" into "measured at build": it parses the canonical
// token source (src/app/globals.css), resolves each status foreground/background pair and
// each text-on-surface pair through the `--c-*` primitive layer (ADR 0081), converts the
// resolved `oklch()` value to relative luminance, and asserts the WCAG 2.x contrast ratio
// clears AA. A sub-AA pair exits non-zero and fails CI.
//
// Scope: the DEFAULT (`:root`) resolution — comfortable density, mission-default tenant.
// The categorical viz palette's colorblind-safety stays a human judgment (no machine CVD
// model is wired yet — ADR 0064 graduation point). `--self-test` proves the math on a known
// black/white pair (ratio 21:1) and a known failing pair.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = join(repoRoot, "src/app/globals.css");

// The pairs the gate enforces, each with its AA threshold (4.5 normal text / 3.0 large).
const PAIRS = [
  ["--status-nominal-fg", "--status-nominal-bg", 4.5],
  ["--status-caution-fg", "--status-caution-bg", 4.5],
  ["--status-warning-fg", "--status-warning-bg", 4.5],
  ["--status-critical-fg", "--status-critical-bg", 4.5],
  ["--text-primary", "--surface-background", 4.5],
  ["--text-primary", "--surface-panel", 4.5],
  ["--text-secondary", "--surface-panel", 4.5],
  ["--text-secondary", "--surface-background", 4.5],
];

/** Map every `--name: value;` declared in any `:root { … }` block (the default layer). */
function readRootVars(css) {
  const vars = {};
  const blocks = css.matchAll(/:root\s*\{([^}]*)\}/g);
  for (const [, body] of blocks) {
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      vars[name] = value.trim();
    }
  }
  return vars;
}

/** Follow a `var(--x)` chain to its concrete value (the primitive at the bottom). */
function resolve(value, vars, depth = 0) {
  if (depth > 16)
    throw new Error(`var() chain too deep starting at '${value}'`);
  const m = value.trim().match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (!m) return value.trim();
  const next = vars[m[1]];
  if (next === undefined) throw new Error(`unresolved variable '${m[1]}'`);
  return resolve(next, vars, depth + 1);
}

/** Parse `oklch(L C H[ / a])` → { L, C, H }. L accepts a 0–1 number or a percentage. */
function parseOklch(value) {
  const m = value.match(
    /oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:\s*\/\s*[\d.]+%?)?\s*\)/i,
  );
  if (!m) throw new Error(`not an oklch() color: '${value}'`);
  const num = (s) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s));
  return { L: num(m[1]), C: num(m[2]), H: parseFloat(m[3]) };
}

/** WCAG relative luminance of an OKLCH color, via OKLab → linear sRGB → Y (gamut-clamped). */
function relativeLuminance({ L, C, H }) {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);

  // OKLab → LMS (cube of the intermediate), then LMS → linear sRGB.
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const clamp = (x) => Math.min(1, Math.max(0, x));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);

  // Linear sRGB are already the linearized channels WCAG luminance expects.
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

/** WCAG 2.x contrast ratio between two OKLCH colors. */
function contrastRatio(fg, bg) {
  const a = relativeLuminance(parseOklch(fg));
  const b = relativeLuminance(parseOklch(bg));
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function runSelfTest() {
  let ok = true;
  const white = "oklch(1 0 0)";
  const black = "oklch(0 0 0)";
  const wb = contrastRatio(white, black);
  if (Math.abs(wb - 21) > 0.5) {
    console.error(
      `self-test FAIL: white/black ratio ${wb.toFixed(2)}, expected ~21`,
    );
    ok = false;
  }
  const ww = contrastRatio(white, white);
  if (Math.abs(ww - 1) > 0.01) {
    console.error(
      `self-test FAIL: white/white ratio ${ww.toFixed(3)}, expected 1`,
    );
    ok = false;
  }
  if (!ok) process.exit(1);
  console.log("check-contrast --self-test: WCAG math OK (white/black = 21:1)");
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

const vars = readRootVars(readFileSync(CSS, "utf8"));
const failures = [];
const rows = [];

for (const [fgName, bgName, min] of PAIRS) {
  const fg = resolve(`var(${fgName})`, vars);
  const bg = resolve(`var(${bgName})`, vars);
  const ratio = contrastRatio(fg, bg);
  const pass = ratio >= min;
  rows.push(
    `  ${pass ? "✓" : "✗"} ${ratio.toFixed(2).padStart(6)} : 1  (min ${min})  ${fgName} on ${bgName}`,
  );
  if (!pass) failures.push({ fgName, bgName, ratio, min });
}

console.log(
  "check:contrast — WCAG 2.2 AA over mission-control token pairs (ADR 0081):",
);
console.log(rows.join("\n"));

if (failures.length) {
  console.error(
    `\ncheck:contrast: ${failures.length} pair(s) below AA — tune the oklch values in src/app/globals.css.`,
  );
  process.exit(1);
}
console.log(
  `\ncheck:contrast: OK — all ${PAIRS.length} pairs clear WCAG 2.2 AA.`,
);
