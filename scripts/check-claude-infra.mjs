#!/usr/bin/env node
// scripts/check-claude-infra.mjs
//
// `check:claude` — integrity gate for the Claude infrastructure itself (the same
// drift-prevention discipline the project applies to code — AI-GUARDRAILS.md §7 —
// turned inward on `.claude/`). Skills, agents, and commands hard-code ~200 ADR numbers
// and dozens of `npm run check:*` / `scripts/*.mjs` references; nothing upstream proves
// they still resolve. When a script is renamed or an ADR is superseded, a skill's
// instructions rot SILENTLY — the "skill drift" failure mode. This gate resolves every
// such reference and fails on the load-bearing ones.
//
// Severity model (low false-positive by construction):
//   ERROR  — a referenced npm script / `scripts/*` file does not exist (a renamed gate);
//            an EXPLICIT `ADR NNNN` / `(NNNN)` reference resolves to no record.
//   WARN   — a bare/range-derived ADR number doesn't resolve (could be a coincidence);
//            an ADR reference resolves but the record is not `accepted`;
//            a `src/design-system/*` path or a cross-referenced agent/skill is missing.
//
// Run `--self-test` to verify the gate still rejects its own violators (the P6 pattern
// of check:gates, applied here): it feeds synthetic content past the real corpus/scripts
// context and asserts the bad references are caught.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import {
  loadCorpus,
  loadConstraints,
  extractAdrRefs,
  extractConRefs,
} from "./lib/adr-corpus.mjs";

const SKILLS_DIR = ".claude/skills";
const AGENTS_DIR = ".claude/agents";
const COMMANDS_DIR = ".claude/commands";

/** Everything the .claude files are allowed to reference, loaded once. */
function loadContext() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const scripts = new Set(Object.keys(pkg.scripts ?? {}));
  const corpus = loadCorpus();
  const cons = loadConstraints();
  const agents = existsSync(AGENTS_DIR)
    ? new Set(
        readdirSync(AGENTS_DIR)
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.replace(/\.md$/, "")),
      )
    : new Set();
  const skills = existsSync(SKILLS_DIR)
    ? new Set(
        readdirSync(SKILLS_DIR).filter((f) =>
          statSync(join(SKILLS_DIR, f)).isDirectory(),
        ),
      )
    : new Set();
  return { scripts, corpus, cons, agents, skills };
}

/** Reference extractors over a single document's text. */
function extractScriptRefs(text) {
  const refs = new Set();
  for (const m of text.matchAll(/\bnpm run\s+([a-z][a-z0-9:-]*)/g))
    refs.add(m[1]);
  for (const m of text.matchAll(
    /`((?:check|gen|ds|test|db|format):[a-z0-9-]+)`/g,
  ))
    refs.add(m[1]);
  for (const m of text.matchAll(/\b((?:check|gen|ds|test|db):[a-z0-9-]+)\b/g))
    refs.add(m[1]);
  return refs;
}
// Capture the MAXIMAL path token (so `.claude/skills/adr/scripts/adr.py` isn't truncated
// to a non-existent `scripts/adr.py`), then keep only the segment of interest. The
// lookbehind anchors the token at a real boundary, not mid-path.
function extractScriptPaths(text) {
  const set = new Set();
  for (const m of text.matchAll(/(?<![\w./-])([\w./-]+\.(?:mjs|py|js|cjs))/g))
    if (m[1].includes("scripts/")) set.add(m[1]);
  return set;
}
function extractDesignSystemPaths(text) {
  const set = new Set();
  for (const m of text.matchAll(/(?<![\w./-])([\w./-]+\.(?:ts|json|md))/g))
    if (m[1].includes("src/design-system/")) set.add(m[1]);
  return set;
}
// Cross-references like ``code-reviewer` agent` or "the storybook-reviewer agent".
function extractAgentRefs(text) {
  const set = new Set();
  for (const m of text.matchAll(
    /`?\b([a-z][a-z0-9]+(?:-[a-z0-9]+)+)`?\s+agent\b/g,
  ))
    set.add(m[1]);
  return set;
}

/** A path reference resolves if it exists from the repo root OR relative to the doc that
 *  cites it — skills reference repo files both ways (`scripts/x.mjs`, `../../../scripts/x.mjs`). */
function refExists(docPath, p) {
  if (existsSync(p)) return true;
  const base = docPath === "self-test" ? "." : dirname(docPath);
  return existsSync(resolve(base, p));
}

/** Lint one document; returns { errors:[], warns:[] } prefixed with `label`. */
function scanText(label, text, ctx) {
  const errors = [];
  const warns = [];

  for (const s of extractScriptRefs(text)) {
    if (!ctx.scripts.has(s))
      errors.push(
        `${label}: references npm script "${s}" — no such script in package.json`,
      );
  }
  for (const p of extractScriptPaths(text)) {
    if (!refExists(label, p))
      errors.push(`${label}: references "${p}" — file does not exist`);
  }
  for (const p of extractDesignSystemPaths(text)) {
    if (!refExists(label, p))
      warns.push(
        `${label}: references "${p}" — file not found (registry not built yet?)`,
      );
  }

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
        `${label}: cites ADR ${id} but its status is "${rec.status}" — expected an accepted record (ADR 0001)`,
      );
    }
  }

  for (const c of extractConRefs(text)) {
    if (!ctx.cons.has(c))
      errors.push(
        `${label}: cites ${c} — no such constraint in constraints.md`,
      );
  }

  for (const a of extractAgentRefs(text)) {
    if (!ctx.agents.has(a))
      warns.push(
        `${label}: refers to the "${a}" agent — no such file in ${AGENTS_DIR}/`,
      );
  }

  return { errors, warns };
}

/** Walk every `.md` under the three .claude trees, skipping `assets/` (template
 *  fixtures with illustrative placeholder numbers/paths, not operative instructions). */
function claudeDocs() {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "assets") walk(p);
      } else if (e.name.endsWith(".md")) out.push(p);
    }
  };
  walk(SKILLS_DIR);
  walk(AGENTS_DIR);
  walk(COMMANDS_DIR);
  return out;
}

function selfTest() {
  const ctx = loadContext();
  const cases = [
    {
      name: "missing npm script",
      text: "Run `npm run check:totally-bogus` before committing.",
      expect: (r) => r.errors.some((e) => /check:totally-bogus/.test(e)),
    },
    {
      name: "dangling explicit ADR",
      text: "This follows ADR 0999 strictly.",
      expect: (r) => r.errors.some((e) => /ADR 0999/.test(e)),
    },
    {
      name: "missing scripts/ path",
      text: "See `scripts/does-not-exist.mjs` for details.",
      expect: (r) => r.errors.some((e) => /does-not-exist\.mjs/.test(e)),
    },
    {
      name: "unknown agent cross-reference",
      text: "Defer deep checks to the `ghost-reviewer` agent.",
      expect: (r) => r.warns.some((w) => /ghost-reviewer/.test(w)),
    },
    {
      name: "clean text yields nothing",
      text: "Run `npm run check:tokens` per ADR 0058; defer to the `code-reviewer` agent.",
      expect: (r) => r.errors.length === 0,
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
      `\ncheck:claude --self-test: ${broken.length} self-test(s) failed — the gate is broken.`,
    );
    process.exit(1);
  }
  console.log(
    `\ncheck:claude --self-test: OK — all ${ok} self-tests pass (the gate rejects its violators).`,
  );
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();

  const ctx = loadContext();
  const docs = claudeDocs();
  const allErrors = [];
  const allWarns = [];
  for (const doc of docs) {
    const { errors, warns } = scanText(doc, readFileSync(doc, "utf8"), ctx);
    allErrors.push(...errors);
    allWarns.push(...warns);
  }

  for (const w of allWarns) console.warn(`  ⚠ ${w}`);
  for (const e of allErrors) console.error(`  ✗ ${e}`);

  const scanned = `${docs.length} doc(s) · ${ctx.corpus.size} ADRs · ${ctx.scripts.size} npm scripts`;
  if (allErrors.length) {
    console.error(
      `\ncheck:claude: ${allErrors.length} error(s), ${allWarns.length} warning(s) across ${scanned}. Claude infra references have drifted.`,
    );
    process.exit(1);
  }
  console.log(
    `\ncheck:claude: OK — ${scanned}, all references resolve${allWarns.length ? ` (${allWarns.length} warning(s) above)` : ""}.`,
  );
}

main();
