#!/usr/bin/env node
// scripts/check-adr-citations.mjs
//
// `check:citations` — reference-integrity gate for ADR/CON citations in OPERATIVE
// non-doc surfaces (ADR 0067). The sibling gates `check:claude` (`.claude/**`) and
// `check:claude-md` (`CLAUDE.md`) already resolve every decision number they cite
// against the corpus; this gate extends the same deterministic discipline to the
// operative files that ALSO hard-code ADR numbers but had no guard:
// `.github/workflows/*.yml` (every CI step names the ADR it enforces) and
// `.env.example` (each secret cites its governing ADR). The corpus renumber (commit
// 009af13) proved these drift silently — `adr.py lint` and `check:claude` stayed green
// while ~25 numbers in those two files went stale.
//
// Severity model (mirrors `check:claude`, low false-positive by construction):
//   ERROR  — an EXPLICIT `ADR NNNN` / `(NNNN)` citation, or a `CON-00x`, resolves to no
//            record (a renamed/renumbered decision).
//   WARN   — a citation resolves to a non-`accepted` record (a template may keep records
//            `proposed` deliberately); a bare/range-derived `00NN` resolves to nothing
//            (could be a coincidence, not an ADR ref).
//
// Run `--self-test` to prove the gate still rejects its own violators (the P6 pattern of
// `check:gates` / `check:claude`, applied here).

import { readdirSync, readFileSync, existsSync } from "node:fs";
import {
  loadCorpus,
  loadConstraints,
  extractAdrRefs,
  extractConRefs,
} from "./lib/adr-corpus.mjs";

// The SINGLE source of truth for which operative surfaces are guarded. Adding a new file
// that cites decisions by number means adding it here — never writing a second parser
// (ADR 0067 / AI-GUARDRAILS §7 single-source discipline).
const WORKFLOWS_DIR = ".github/workflows";
function surfaces() {
  const out = [];
  if (existsSync(WORKFLOWS_DIR)) {
    for (const f of readdirSync(WORKFLOWS_DIR).sort())
      if (f.endsWith(".yml") || f.endsWith(".yaml"))
        out.push(`${WORKFLOWS_DIR}/${f}`);
  }
  if (existsSync(".env.example")) out.push(".env.example");
  if (existsSync("README.md")) out.push("README.md");
  return out;
}

const loadCtx = () => ({ corpus: loadCorpus(), cons: loadConstraints() });

/** Lint one surface's text; returns { errors:[], warns:[] } prefixed with `label`. */
function scanText(label, text, ctx) {
  const errors = [];
  const warns = [];

  const { explicit, all } = extractAdrRefs(text);
  for (const n of all) {
    const rec = ctx.corpus.get(n);
    const id = String(n).padStart(4, "0");
    if (!rec) {
      if (explicit.has(n))
        errors.push(
          `${label}: cites ADR ${id} — no such record in docs/decisions/`,
        );
      else
        warns.push(
          `${label}: mentions "${id}" — resolves to no ADR (typo, or not an ADR ref?)`,
        );
    } else if (rec.status !== "accepted") {
      warns.push(
        `${label}: cites ADR ${id} but its status is "${rec.status}" — not an accepted record (ADR 0001)`,
      );
    }
  }

  for (const c of extractConRefs(text)) {
    if (!ctx.cons.has(c))
      errors.push(
        `${label}: cites ${c} — no such constraint in constraints.md`,
      );
  }

  return { errors, warns };
}

function selfTest() {
  const ctx = loadCtx();
  const cases = [
    {
      name: "dangling explicit ADR",
      text: "      - name: Build (ADR 0999)",
      expect: (r) => r.errors.some((e) => /ADR 0999/.test(e)),
    },
    {
      name: "dangling constraint",
      text: "# Token governed by CON-099 (env-reference).",
      expect: (r) => r.errors.some((e) => /CON-099/.test(e)),
    },
    {
      name: "clean citations yield no error",
      text: "      - name: Coverage gate (ADR 0008); secrets per ADR 0044.",
      expect: (r) => r.errors.length === 0,
    },
    // The corpus crossed 0100, so every pattern must span 0000–0999. Each case below is
    // dangling *past* 0099: before the widening they matched nothing at all and the gate
    // stayed silent — a false negative that hid real typos.
    {
      name: "dangling parenthesised ADR past 0099",
      text: "Value leaves are governed by (0999).",
      expect: (r) => r.errors.some((e) => /ADR 0999/.test(e)),
    },
    {
      name: "dangling bare reference past 0099",
      text: "The archetype rule is stated in 0998 for context.",
      expect: (r) => r.warns.some((w) => /"0998"/.test(w)),
    },
    {
      // Endpoints sit far above any plausible corpus so the case can never resolve to a
      // real record (0101 would have become one within a release). `0996` is asserted
      // because it appears ONLY via range expansion — it is absent from the text itself.
      name: "range spanning past 0099 expands",
      text: "Design-system governance (decided 0995–0997).",
      expect: (r) => r.warns.some((w) => /"0996"/.test(w)),
    },
  ];
  let ok = 0;
  const broken = [];
  for (const c of cases) {
    const r = scanText("self-test", c.text, ctx);
    if (c.expect(r)) {
      ok++;
      console.log(`  ✓ ${c.name}`);
    } else {
      broken.push(c.name);
      console.error(`  ✗ ${c.name} — gate did NOT behave as expected`);
    }
  }
  if (broken.length) {
    console.error(
      `\ncheck:citations --self-test: ${broken.length} self-test(s) failed — the gate is broken.`,
    );
    process.exit(1);
  }
  console.log(
    `\ncheck:citations --self-test: OK — all ${ok} self-tests pass (the gate rejects its violators).`,
  );
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();

  const ctx = loadCtx();
  const files = surfaces();
  const allErrors = [];
  const allWarns = [];
  for (const f of files) {
    const { errors, warns } = scanText(f, readFileSync(f, "utf8"), ctx);
    allErrors.push(...errors);
    allWarns.push(...warns);
  }

  for (const w of allWarns) console.warn(`  ⚠ ${w}`);
  for (const e of allErrors) console.error(`  ✗ ${e}`);

  const scanned = `${files.length} surface(s) · ${ctx.corpus.size} ADRs · ${ctx.cons.size} constraints`;
  if (allErrors.length) {
    console.error(
      `\ncheck:citations: ${allErrors.length} error(s), ${allWarns.length} warning(s) across ${scanned}. ADR/CON citations have drifted.`,
    );
    process.exit(1);
  }
  console.log(
    `\ncheck:citations: OK — ${scanned}, all ADR/CON citations resolve${allWarns.length ? ` (${allWarns.length} warning(s) above)` : ""}.`,
  );
}

main();
