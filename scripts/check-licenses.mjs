#!/usr/bin/env node
// scripts/check-licenses.mjs — dependency license-compliance gate (ADR 0071).
//
// Fails if any PRODUCTION dependency carries a license outside the permissive allowlist —
// a reusable template's downstream inherits its whole tree, so a stray copyleft/unknown
// license is a distribution risk for every consuming project. Wraps
// license-checker-rseidelsohn; the allowlist and the documented exceptions below are the
// single source of truth — widening either is a deliberate, reviewed decision (ADR 0046).

import { spawnSync } from "node:child_process";
import { join, delimiter } from "node:path";

// Make the locally-installed binary resolvable whether invoked via `npm run` (which adds
// node_modules/.bin to PATH) or directly with `node scripts/check-licenses.mjs`.
const env = {
  ...process.env,
  PATH:
    join(process.cwd(), "node_modules", ".bin") + delimiter + process.env.PATH,
};

// Permissive SPDX identifiers acceptable for a reusable template.
const ALLOWED = [
  "MIT",
  "ISC",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "Apache-2.0",
  "Apache-2.0 AND MIT", // @swc/* native binaries — both halves permissive
  "CC0-1.0",
  "Unlicense",
  "BlueOak-1.0.0",
  "Python-2.0",
  "CC-BY-4.0", // caniuse-lite — an attribution-only DATA license (browser-compat DB), not code copyleft
];

// Documented exceptions excluded by name prefix (the package family differs per platform,
// so an exact name@version exclusion would not survive a Linux-vs-macOS CI runner):
//   @img/sharp-libvips-*  — libvips is LGPL-3.0-or-later, consumed by `sharp` (Next.js image
//     optimization) as a DYNAMICALLY-LINKED native library. The LGPL permits use from a
//     permissively-licensed project; it is an optional platform binary, not linked source.
const EXCLUDE_PREFIXES = ["@img/sharp-libvips"];

const args = [
  "--production", // devDependencies are not distributed
  "--excludePrivatePackages", // the template's own private package reports UNLICENSED
  "--excludePackagesStartingWith",
  EXCLUDE_PREFIXES.join(";"),
  "--onlyAllow",
  ALLOWED.join(";"),
];

const r = spawnSync("license-checker-rseidelsohn", args, {
  stdio: ["ignore", "ignore", "inherit"],
  shell: false,
  env,
});

if (r.error) {
  console.error(
    `check:licenses — could not run license-checker-rseidelsohn: ${r.error.message}`,
  );
  process.exit(1);
}
if (r.status !== 0) {
  console.error(
    `\ncheck:licenses: a production dependency carries a non-allowlisted license (ADR 0071). ` +
      `Identify it with \`npx license-checker-rseidelsohn --production --summary\`, then widen ` +
      `the allowlist / exceptions in this file only deliberately.`,
  );
  process.exit(1);
}
console.log(
  "check:licenses: OK — every production dependency is under the permissive allowlist (ADR 0071).",
);
