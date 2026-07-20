// scripts/lib/adr-corpus.mjs
//
// Shared, dependency-free helpers for the Claude-infrastructure integrity gates
// (`check:claude`, `check:claude-md`). The ADR record files are the ground truth —
// their frontmatter `status:` is authoritative, not the regenerated README index — so
// these helpers read `docs/decisions/` directly. `extractAdrRefs` understands the three
// shapes the corpus is cited in: explicit `ADR 0058`, parenthesised `(0058)`, and
// en-dash ranges like `0058–0064` (CLAUDE.md writes batches that way). It distinguishes
// EXPLICIT references (a dangling one is a hard error) from BARE/range-derived ones (a
// dangling one is only a warning — a bare four-digit token could be a coincidence).

import { readdirSync, readFileSync, existsSync } from "node:fs";

/** Map every ADR record number → { id, status, file }, read from the record files. */
export function loadCorpus(dir = "docs/decisions") {
  const map = new Map();
  for (const f of readdirSync(dir)) {
    const m = /^(\d{4})-.+\.md$/.exec(f);
    if (!m) continue;
    const text = readFileSync(`${dir}/${f}`, "utf8");
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    let status = "unknown";
    if (fm) {
      // `status_kind` semantics: a raw `superseded by 0007` collapses to its first word.
      const s = /status:\s*"?([a-z]+)/i.exec(fm[1]);
      if (s) status = s[1].toLowerCase();
    }
    map.set(parseInt(m[1], 10), { id: m[1], status, file: `${dir}/${f}` });
  }
  return map;
}

/** The set of declared constraint IDs (`CON-001`, …) from the registry. */
export function loadConstraints(file = "docs/decisions/constraints.md") {
  const set = new Set();
  if (!existsSync(file)) return set;
  for (const m of readFileSync(file, "utf8").matchAll(/\bCON-(\d{3})\b/g)) {
    set.add(`CON-${m[1]}`);
  }
  return set;
}

/**
 * Extract ADR references from arbitrary text.
 * @returns {{ explicit: Set<number>, all: Set<number> }}
 *   `explicit` — `ADR NNNN` / `(NNNN)` forms (dangling → error-worthy).
 *   `all` — explicit + bare `0NNN` + expanded `0NNN–0MMM` ranges (dangling → warn-worthy).
 */
export function extractAdrRefs(text) {
  const explicit = new Set();
  const all = new Set();
  const add = (n, isExplicit) => {
    all.add(n);
    if (isExplicit) explicit.add(n);
  };
  // All four patterns span 0000–0999 so the corpus keeps working past 0099. A year can
  // never collide: `(2026-…)` and friends start with 1/2, and `0NNN` requires a leading 0.
  // `ADR 0058`, `ADR-0058`. The trailing \b keeps a longer run (`ADR 01234`) from
  // yielding a partial `0123` match, matching the boundedness of the patterns below.
  for (const m of text.matchAll(/ADR[\s-]?(0\d{3})\b/gi)) add(+m[1], true);
  // Parenthesised `(0058` followed by a delimiter.
  for (const m of text.matchAll(/\((0\d{3})(?=[\s,;)])/g)) add(+m[1], true);
  // Ranges `0058–0064` / `0048-0057` → fill the span (bare severity).
  for (const m of text.matchAll(/\b(0\d{3})\s*[–—-]\s*(0\d{3})\b/g)) {
    const a = +m[1];
    const b = +m[2];
    if (b >= a && b - a < 200) for (let i = a; i <= b; i++) add(i, false);
  }
  // Any remaining bare `0NNN` token.
  for (const m of text.matchAll(/\b(0\d{3})\b/g)) add(+m[1], false);
  return { explicit, all };
}

/** Extract `CON-00x` references from arbitrary text. */
export function extractConRefs(text) {
  const set = new Set();
  for (const m of text.matchAll(/\bCON-(\d{3})\b/g)) set.add(`CON-${m[1]}`);
  return set;
}

/** Render a small "N: a, b, c" list for human output, sorted, ADR-id padded. */
export function fmtNums(nums) {
  return [...nums]
    .sort((a, b) => a - b)
    .map((n) => String(n).padStart(4, "0"))
    .join(", ");
}
