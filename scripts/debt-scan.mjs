#!/usr/bin/env node
// scripts/debt-scan.mjs
//
// `check:debt` — technical-debt inventory for this project's *sanctioned* escape hatches.
// The ADRs don't forbid every shortcut; they ALLOW a few, each conditional on a recorded
// justification. Debt here is those allowances used WITHOUT their condition met — an
// `eslint-disable` with no reason (ADR 0003), a `"use no memo"` with no explanation
// (ADR 0029), an `applicable:false` design-intent state with no rationale (ADR 0062), a
// quarantined test past its time-box (ADR 0049). This scanner finds every escape hatch,
// checks whether its mandated justification is present (and, for quarantines, still in
// date), and lists what needs attention. It feeds the Defect Log loop (ADR 0064).
//
// Exit code: 1 if any escape hatch is UNJUSTIFIED or any quarantine is EXPIRED — those
// violate the ADR's own terms. Plain TODO/FIXME markers are reported but never fail.
// Flags: --all (list justified hatches and markers too) · --json (machine output).

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src", "app", "e2e", "supabase"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "storybook-static",
  "__snapshots__",
  "dist",
]);
const SCAN_EXT = /\.(tsx?|jsx?|mjs|cjs|sql|css)$/;
const SKIP_FILE = /(\.generated\.|database\.types\.|\.snap$)/;

const showAll = process.argv.includes("--all");
const asJson = process.argv.includes("--json");
const NOW = new Date();

function walk(dir, out) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), out);
    } else if (SCAN_EXT.test(e.name) && !SKIP_FILE.test(e.name)) {
      out.push(join(dir, e.name));
    }
  }
}

const findings = [];
function record(f) {
  findings.push(f);
}

/** Is there a human reason on this line (after `--`) or in the 2 lines above it? */
function hasNearbyReason(lines, i) {
  if (/--\s*\S/.test(lines[i])) return true; // eslint `-- reason`
  for (let j = Math.max(0, i - 2); j <= i; j++) {
    const c = lines[j];
    if (
      j !== i &&
      /\/\/|\/\*|\*\s/.test(c) &&
      /[a-z]{4,}/i.test(c.replace(/[^a-z]/gi, ""))
    )
      return true;
  }
  return false;
}

function scanFile(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  const isStory = /\.stories\.tsx?$/.test(path);
  const isIntent = /\.design-intent\.ts$/.test(path);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const at = { file: path, line: i + 1 };

    // ADR 0003 — `any` escape / general eslint-disable, needs a `-- reason`.
    if (/eslint-disable(-next-line|-line)?/.test(line)) {
      const isAny = /no-explicit-any/.test(line);
      const justified = /--\s*\S/.test(line);
      record({
        ...at,
        category: isAny ? "any-escape (0003)" : "eslint-disable (0006)",
        adr: isAny ? "0003" : "0006",
        text: line.trim(),
        status: justified ? "ok" : "unjustified",
        need: "an eslint `-- reason` on the disable directive",
      });
    }

    // ADR 0029 — React Compiler owns memoization; `"use no memo"` must be documented.
    if (/["']use no memo["']/.test(line)) {
      record({
        ...at,
        category: "use-no-memo (0029)",
        adr: "0029",
        text: line.trim(),
        status: hasNearbyReason(lines, i) ? "ok" : "unjustified",
        need: "a comment explaining why the compiler is opted out here",
      });
    }

    // TS suppressions — debt even though no ADR names them; bare ones are worst.
    if (/@ts-(expect-error|ignore)/.test(line)) {
      const described = /@ts-(expect-error|ignore)\s+\S/.test(line);
      record({
        ...at,
        category: "ts-suppress",
        adr: "—",
        text: line.trim(),
        status: described ? "ok" : "unjustified",
        need: "a description after the @ts- directive",
      });
    }

    // ADR 0039 — a11y opt-out only as an explicit, reasoned per-story parameter.
    if (
      isStory &&
      /a11y\s*:/.test(line) &&
      /(disable\s*:\s*true|test\s*:\s*\[?\s*["']off)/.test(line)
    ) {
      record({
        ...at,
        category: "a11y-opt-out (0039)",
        adr: "0039",
        text: line.trim(),
        status: hasNearbyReason(lines, i) ? "ok" : "unjustified",
        need: "a stated reason for the a11y opt-out (ADR 0039)",
      });
    }

    // ADR 0062 — every `applicable:false` design-intent state needs a rationale.
    if (isIntent && /applicable\s*:\s*false/.test(line)) {
      const sameLine = /rationale\s*:/.test(line);
      const nextLine =
        i + 1 < lines.length && /rationale\s*:/.test(lines[i + 1]);
      record({
        ...at,
        category: "applicable-false (0062)",
        adr: "0062",
        text: line.trim(),
        status: sameLine || nextLine ? "ok" : "unjustified",
        need: "a `rationale` for the inapplicable state (ADR 0062)",
      });
    }

    // ADR 0049 — quarantined/skipped test: needs a tracked issue AND a time-box still in date.
    if (
      /\b(it|test|describe)\.skip\b|\b(xit|xdescribe)\b|\.todo\s*\(/.test(line)
    ) {
      const window = lines.slice(Math.max(0, i - 3), i + 4).join("\n");
      const hasIssue = /#\d+|https?:\/\/\S+/.test(window);
      const dateM = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(window);
      let status = "unjustified";
      let need = "a tracked issue + a time-box date (ADR 0049)";
      if (hasIssue && dateM) {
        const boxed = new Date(`${dateM[1]}-${dateM[2]}-${dateM[3]}T00:00:00Z`);
        if (boxed < NOW) {
          status = "expired";
          need = `time-box ${dateM[0]} has passed — un-quarantine or re-justify (ADR 0049)`;
        } else {
          status = "ok";
        }
      }
      record({
        ...at,
        category: "test-quarantine (0049)",
        adr: "0049",
        text: line.trim(),
        status,
        need,
      });
    }

    // Plain debt markers — informational, never fail.
    const marker = /\b(TODO|FIXME|HACK|XXX)\b/.exec(line);
    if (marker) {
      record({
        ...at,
        category: `marker:${marker[1]}`,
        adr: "—",
        text: line.trim(),
        status: "info",
        need: "",
      });
    }
  }
}

const files = [];
for (const r of ROOTS) walk(r, files);
for (const f of files) scanFile(f);

const attention = findings.filter(
  (f) => f.status === "unjustified" || f.status === "expired",
);

if (asJson) {
  console.log(JSON.stringify({ scanned: files.length, findings }, null, 2));
  process.exit(attention.length ? 1 : 0);
}

// Summary table by category.
const cats = new Map();
for (const f of findings) {
  const c = cats.get(f.category) ?? { total: 0, ok: 0, attn: 0, info: 0 };
  c.total++;
  if (f.status === "ok") c.ok++;
  else if (f.status === "info") c.info++;
  else c.attn++;
  cats.set(f.category, c);
}

console.log(
  `check:debt — ${files.length} file(s) scanned across ${ROOTS.join(", ")}\n`,
);
if (cats.size) {
  const pad = Math.max(...[...cats.keys()].map((k) => k.length), 8);
  console.log(`  ${"category".padEnd(pad)}  total  ok  attn  info`);
  for (const [k, c] of [...cats].sort()) {
    console.log(
      `  ${k.padEnd(pad)}  ${String(c.total).padStart(5)}  ${String(c.ok).padStart(2)}  ${String(c.attn).padStart(4)}  ${String(c.info).padStart(4)}`,
    );
  }
  console.log("");
}

const listed = showAll ? findings : attention;
for (const f of listed) {
  const tag =
    f.status === "expired"
      ? "EXPIRED"
      : f.status === "unjustified"
        ? "NEEDS"
        : f.status === "ok"
          ? "ok"
          : "info";
  console.log(
    `  [${tag}] ${f.file}:${f.line} — ${f.category}${f.need ? ` — ${f.need}` : ""}`,
  );
}

if (attention.length) {
  console.error(
    `\ncheck:debt: ${attention.length} sanctioned escape hatch(es) missing their required justification or past their time-box. These violate the ADR's own terms.`,
  );
  process.exit(1);
}
console.log(
  `\ncheck:debt: OK — ${findings.length} debt item(s) found, all sanctioned ones justified${findings.length ? " (run with --all to list every item)" : ""}.`,
);
