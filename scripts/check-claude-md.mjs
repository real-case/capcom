#!/usr/bin/env node
// scripts/check-claude-md.mjs
//
// `check:claude-md` — keeps CLAUDE.md (what the agent READS as standing memory) from
// drifting away from the accepted ADR corpus (what the project DECIDED). `gen:types` and
// `gen:tokens` are byte-diff drift checks because a deterministic generator exists;
// CLAUDE.md is synthesised by the `adr-sync-claude-md` skill (agent-authored prose), so a
// byte-diff is impossible. Instead this gate checks the CITATION CONTRACT, which is
// deterministic, in both directions:
//
//   ERROR — CLAUDE.md cites an ADR (`ADR NNNN` / `(NNNN)`) that resolves to no record;
//           CLAUDE.md cites a CON-00x that isn't in constraints.md.
//   WARN  — CLAUDE.md cites a record that is NOT `accepted` (the skill's cardinal rule is
//           "accepted only" — a `proposed`/`superseded` citation is provisional drift);
//         — an `accepted` ADR is NOT reflected anywhere in CLAUDE.md (decided but never
//           synced into memory — the "you forgot to run adr-sync-claude-md" signal).
//
// `--strict` promotes both warning classes to errors — for when the project leaves
// bootstrap and CLAUDE.md is meant to mirror the accepted corpus exactly.

import { readFileSync, existsSync } from "node:fs";
import {
  loadCorpus,
  loadConstraints,
  extractAdrRefs,
  extractConRefs,
  fmtNums,
} from "./lib/adr-corpus.mjs";

const FILE = "CLAUDE.md";
const strict = process.argv.includes("--strict");

if (!existsSync(FILE)) {
  console.error(`check:claude-md: ${FILE} not found.`);
  process.exit(1);
}

const text = readFileSync(FILE, "utf8");
const corpus = loadCorpus();
const cons = loadConstraints();

const errors = [];
const warns = [];

const { explicit, all } = extractAdrRefs(text);

// Direction 1 — every citation in CLAUDE.md must resolve, and should be accepted.
for (const n of all) {
  const id = String(n).padStart(4, "0");
  const rec = corpus.get(n);
  if (!rec) {
    if (explicit.has(n))
      errors.push(`cites ADR ${id} — no such record in docs/decisions/`);
    else
      warns.push(
        `mentions "${id}" — resolves to no ADR (typo, or not an ADR reference?)`,
      );
  } else if (rec.status !== "accepted") {
    (strict ? errors : warns).push(
      `cites ADR ${id} but its status is "${rec.status}" — CLAUDE.md must derive from accepted records only (adr-sync-claude-md cardinal rule)`,
    );
  }
}

for (const c of extractConRefs(text)) {
  if (!cons.has(c))
    errors.push(`cites ${c} — no such constraint in constraints.md`);
}

// Direction 2 — coverage: every accepted ADR should be reflected in CLAUDE.md.
const missing = [];
for (const [n, rec] of corpus) {
  if (rec.status === "accepted" && !all.has(n)) missing.push(n);
}
if (missing.length) {
  (strict ? errors : warns).push(
    `${missing.length} accepted ADR(s) not reflected in CLAUDE.md: ${fmtNums(missing)} — run adr-sync-claude-md to fold them into project memory`,
  );
}

for (const w of warns) console.warn(`  ⚠ ${w}`);
for (const e of errors) console.error(`  ✗ ${e}`);

const accepted = [...corpus.values()].filter(
  (r) => r.status === "accepted",
).length;
const summary = `${corpus.size} ADRs (${accepted} accepted) · ${cons.size} constraints · ${all.size} cited in CLAUDE.md`;

if (errors.length) {
  console.error(
    `\ncheck:claude-md: ${errors.length} error(s), ${warns.length} warning(s). ${summary}. CLAUDE.md has drifted from the decision record.`,
  );
  process.exit(1);
}
console.log(
  `\ncheck:claude-md: OK — ${summary}${warns.length ? ` (${warns.length} warning(s) above)` : ", every citation resolves and every accepted ADR is reflected"}.`,
);
