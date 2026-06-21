#!/usr/bin/env node
// scripts/hooks/guard-protected-files.mjs
//
// PreToolUse guard (Claude Code hook). Turns CLAUDE.md's "human-only" / "never edit
// in place" rules from honor-system prose into a DETERMINISTIC block — the same posture
// the design-system `check:*` gates take for component rules (ADR 0058–0064), applied
// here to the agent's own Edit/Write.
//
// Blocks an Edit / Write / NotebookEdit when the target is:
//   • an ACCEPTED ADR (docs/decisions/NNNN-*.md, status: accepted) — accepted records
//     change only via a superseding record, never in place (ADR 0001); use adr-supersede.
//   • docs/decisions/constraints.md — editing the constraints registry is human-only
//     (ADR 0046).
//   • a real secrets file (.env, .env.<x>) except the committed .env.example — secrets
//     are human-provisioned and never tracked (ADR 0018 / 0046).
//   • tailwind.config.* — Tailwind is configured CSS-first via @theme; there is no
//     config file (ADR 0032).
//   • a DOM-snapshot baseline (__snapshots__/, *.snap) — baselines update only as a
//     REVIEWED action (ADR 0040), never as a silent side effect of an agent edit.
//
// Also blocks a Bash `vitest -u` / `--update` run for the same ADR 0040 reason — a
// baseline regeneration is the command-line spelling of the same unreviewed update.
//
// Contract: read the hook payload on stdin; exit 2 with the reason on stderr to BLOCK
// (Claude is shown the reason and picks another path); exit 0 to allow. Fails OPEN on
// any unexpected error — a guard must never brick every edit because its own input
// shape changed.

import { existsSync, readFileSync } from "node:fs";
import { basename, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(import.meta.url), "..", "..", "..");

// Template-maintenance waiver for the ACCEPTED-ADR immutability guard (clause 5 ONLY).
// This repo is a reusable starter template, so its own maintainer has to fix typos, stale
// versions and wrong cross-references in already-accepted records *in place* — superseding
// every record over a one-word change would bloat the corpus (the edit-in-place waiver). The
// guard still SHIPS its protective default: it blocks accepted-ADR edits unless an EXPLICIT,
// out-of-band, auditable opt-in is present, so a downstream project that adopts this template
// keeps ADR 0001 immutability enforced. The opt-in is a human-dropped sentinel file
// (`.adr-edit-waiver`, git-ignored) or `CLAUDE_ADR_EDIT_WAIVER=1` — never something an ordinary
// edit can set — and every bypass is logged to stderr. It relaxes ONLY clause 5; secrets,
// constraints.md, the Tailwind-config ban and snapshot baselines stay blocked unconditionally.
const ADR_EDIT_WAIVER =
  process.env.CLAUDE_ADR_EDIT_WAIVER === "1" ||
  existsSync(resolve(repoRoot, ".adr-edit-waiver"));

function block(reason) {
  process.stderr.write(
    `⛔ Blocked by guard-protected-files (CLAUDE.md): ${reason}\n`,
  );
  process.exit(2);
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

let payload;
try {
  payload = JSON.parse(readStdin() || "{}");
} catch {
  process.exit(0); // unparseable payload → fail open
}

const input = payload.tool_input ?? {};

// 0. Bash branch: a `vitest -u` / `--update` run regenerates snapshot baselines —
//    a reviewed action (ADR 0040), so the agent must ask a human first. The regex is
//    deliberately narrow (a vitest token followed by a -u/--update flag on the SAME
//    line — a real invocation never splits them, and the line bound stops commit-
//    message heredocs that merely mention the phrase across lines from false-firing).
//    Anything else falls through and the guard stays fail-open.
if (payload.tool_name === "Bash" && typeof input.command === "string") {
  if (/\bvitest\b[^|;&\n]*\s--?u(pdate)?\b/.test(input.command)) {
    block(
      "`vitest -u` regenerates DOM-snapshot baselines, which update only as a " +
        "REVIEWED action (ADR 0040) — the hook cannot verify an approval, so the " +
        "update is human-run. Show the human the failing snapshot diff and ask them " +
        "to run `npx vitest -u` themselves (e.g. via `! npx vitest -u`).",
    );
  }
  process.exit(0); // other Bash commands are not this guard's concern
}

const filePath = input.file_path ?? input.notebook_path ?? input.path;
if (!filePath || typeof filePath !== "string") process.exit(0);

const abs = resolve(filePath);
const relPosix = relative(repoRoot, abs).split(sep).join("/");
const base = basename(relPosix);

// 1. Secrets file — .env, .env.local, … but NOT the committed .env.example template.
if (/^\.env(\..+)?$/.test(base) && base !== ".env.example") {
  block(
    `${relPosix} is a secrets file — values are human-provisioned and never tracked ` +
      `(ADR 0018 / 0046). Edit .env by hand; add placeholders to .env.example instead.`,
  );
}

// 2. The constraints registry — human-only (ADR 0046).
if (relPosix === "docs/decisions/constraints.md") {
  block(
    "docs/decisions/constraints.md is human-only — externally-fixed client mandates " +
      "(CON-00x) are edited by a person, not the agent (ADR 0046).",
  );
}

// 3. No Tailwind config — CSS-first only (ADR 0032). Match the basename anywhere.
if (/^tailwind\.config\.(c|m)?[jt]s$/.test(base)) {
  block(
    `${base} is banned — Tailwind is configured CSS-first via @theme in ` +
      `src/app/globals.css; there is no config file (ADR 0032).`,
  );
}

// 4. Snapshot baselines change only as a reviewed action (ADR 0040).
if (relPosix.includes("/__snapshots__/") || relPosix.endsWith(".snap")) {
  block(
    `${relPosix} is a DOM-snapshot baseline — baselines update only as a REVIEWED ` +
      `action (ADR 0040), never as an agent edit. Show the human the snapshot diff ` +
      `and ask them to run \`npx vitest -u\` themselves.`,
  );
}

// 5. Accepted ADRs are immutable — supersede, never edit in place (ADR 0001).
if (/^docs\/decisions\/\d{4}-.+\.md$/.test(relPosix)) {
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    process.exit(0); // file doesn't exist yet → a NEW ADR is being created → allow
  }
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const status = fm
    ? (fm[1].match(/^\s*status:\s*["']?([a-z]+)["']?/im)?.[1] ?? null)
    : null;
  if (status === "accepted") {
    if (ADR_EDIT_WAIVER) {
      process.stderr.write(
        `⚠ guard-protected-files: ADR-edit waiver active — allowing in-place edit of ACCEPTED ` +
          `${relPosix}. This bypasses ADR 0001 immutability and is intended for TEMPLATE ` +
          `MAINTENANCE only. Remove ./.adr-edit-waiver (or unset CLAUDE_ADR_EDIT_WAIVER) to ` +
          `restore the shipped guard.\n`,
      );
      process.exit(0);
    }
    block(
      `${relPosix} is an ACCEPTED ADR — accepted records are never edited in place. ` +
        `Record a superseding ADR instead (adr-supersede / \`adr.py supersede\`), per ADR 0001. ` +
        `(Template maintainers: see the ADR-edit waiver documented at the top of this hook.)`,
    );
  }
}

process.exit(0);
