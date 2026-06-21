#!/usr/bin/env node
// scripts/check-action-pins.mjs
//
// `check:action-pins` — enforce that every GitHub Actions `uses:` in
// `.github/workflows/*.yml` is pinned to a full 40-hex commit SHA (ADR 0070), turning the
// pinning posture of ADR 0044 into a verifiable invariant instead of a reviewer's memory.
// A mutable `@v4` tag or `@main` branch ref is an unreviewed code-execution surface in CI
// (the retag/compromise supply-chain attack SHA-pinning exists to prevent).
//
// Dependency-free; ships a P6 `--self-test` (the pattern of check:citations / check:claude).
//
//   ERROR — a `uses:` ref is not a 40-hex commit SHA (a tag, a branch, or missing).
// Exempt: local actions/workflows (`./…`, `../…`) and docker digests (`docker://…@sha256:…`).
// Renovate bumps the SHA and leaves a `# vX.Y.Z` trailer — the gate checks the ref token,
// not the comment, so legitimate pin-bumps pass.

import { readdirSync, readFileSync, existsSync } from "node:fs";

const WORKFLOWS_DIR = ".github/workflows";
const SHA = /^[0-9a-f]{40}$/;

function workflows() {
  if (!existsSync(WORKFLOWS_DIR)) return [];
  return readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .sort()
    .map((f) => `${WORKFLOWS_DIR}/${f}`);
}

/** Every `uses:` value (comment + quotes stripped) with its 1-based line number. */
function usesRefs(text) {
  const out = [];
  text.split(/\r?\n/).forEach((ln, i) => {
    const m = /^\s*-?\s*uses:\s*(\S+)/.exec(ln);
    if (m) out.push({ value: m[1].replace(/['"]/g, ""), line: i + 1 });
  });
  return out;
}

/** Is this `uses:` value acceptably pinned? */
function isPinned(value) {
  if (value.startsWith("./") || value.startsWith("../")) return true; // local action / reusable workflow
  if (value.startsWith("docker://")) return /@sha256:[0-9a-f]{64}$/.test(value);
  const at = value.lastIndexOf("@");
  if (at === -1) return false; // no ref at all
  return SHA.test(value.slice(at + 1));
}

function scanText(label, text) {
  const errors = [];
  for (const { value, line } of usesRefs(text)) {
    if (!isPinned(value))
      errors.push(
        `${label}:${line}: \`uses: ${value}\` is not pinned to a 40-hex commit SHA (ADR 0044/0070)`,
      );
  }
  return errors;
}

function selfTest() {
  const sha = "df4cb1c069e1874edd31b4311f1884172cec0e10";
  const cases = [
    {
      name: "tag ref rejected",
      text: "      - uses: actions/checkout@v4",
      expect: (e) => e.length === 1,
    },
    {
      name: "branch ref rejected",
      text: "      - uses: actions/checkout@main",
      expect: (e) => e.length === 1,
    },
    {
      name: "SHA ref accepted (with vX.Y.Z trailer)",
      text: `      - uses: actions/checkout@${sha} # v6.0.3`,
      expect: (e) => e.length === 0,
    },
    {
      name: "local action accepted",
      text: "      - uses: ./.github/actions/setup",
      expect: (e) => e.length === 0,
    },
  ];
  let ok = 0;
  const broken = [];
  for (const c of cases) {
    const e = scanText("self-test", c.text);
    if (c.expect(e)) {
      ok++;
      console.log(`  ✓ ${c.name}`);
    } else {
      broken.push(c.name);
      console.error(`  ✗ ${c.name} — gate did NOT behave as expected`);
    }
  }
  if (broken.length) {
    console.error(
      `\ncheck:action-pins --self-test: ${broken.length} self-test(s) failed — the gate is broken.`,
    );
    process.exit(1);
  }
  console.log(
    `\ncheck:action-pins --self-test: OK — all ${ok} self-tests pass (the gate rejects its violators).`,
  );
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();
  const files = workflows();
  const all = [];
  for (const f of files) all.push(...scanText(f, readFileSync(f, "utf8")));
  for (const e of all) console.error(`  ✗ ${e}`);
  if (all.length) {
    console.error(
      `\ncheck:action-pins: ${all.length} unpinned action(s) across ${files.length} workflow(s). Pin to a commit SHA (ADR 0044/0070).`,
    );
    process.exit(1);
  }
  console.log(
    `\ncheck:action-pins: OK — every \`uses:\` across ${files.length} workflow(s) is SHA-pinned (ADR 0044/0070).`,
  );
}

main();
