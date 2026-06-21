#!/usr/bin/env node
// scripts/check-i18n-parity.mjs
//
// ADR 0055 — localization key parity + ICU syntax, the blocking half of the
// AI-first translation workflow. Non-source catalogs are drafted from the canonical
// source locale; this gate fails the build if any catalog drifts in keys or ships
// malformed ICU. With a single locale today (ADR 0030) the parity check is vacuous
// but the ICU check runs over the source — and the machinery is ready the moment a
// second locale lands. No third-party dependency.
//
// ICU note: this is a lightweight structural check (balanced braces, no empty
// placeholders) — enough to catch the common drafting errors. It can graduate to a
// full @formatjs ICU parser if richer validation proves necessary (ADR 0064).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MESSAGES_DIR = "messages";
const ROUTING_TS = "src/i18n/routing.ts";

const errors = [];

/** The canonical source locale (defaultLocale, ADR 0030) — falls back to "en". */
function canonicalLocale() {
  const m = readFileSync(ROUTING_TS, "utf8").match(
    /defaultLocale:\s*"([^"]+)"/,
  );
  return m ? m[1] : "en";
}

/** Flatten a nested catalog into dotted leaf keys → string values. */
function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

/** Structural ICU sanity: balanced braces and no empty `{}` placeholder. */
function icuProblems(value) {
  if (typeof value !== "string") return [];
  const problems = [];
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "{") {
      depth++;
      if (value[i + 1] === "}") problems.push("empty `{}` placeholder");
    } else if (value[i] === "}") {
      depth--;
      if (depth < 0) {
        problems.push("unbalanced `}`");
        break;
      }
    }
  }
  if (depth > 0) problems.push("unbalanced `{`");
  return [...new Set(problems)];
}

const canonical = canonicalLocale();
const catalogs = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json"));
const canonicalFile = `${canonical}.json`;
if (!catalogs.includes(canonicalFile)) {
  console.error(
    `check-i18n: canonical catalog ${join(MESSAGES_DIR, canonicalFile)} is missing.`,
  );
  process.exit(1);
}

const sourceFlat = flatten(
  JSON.parse(readFileSync(join(MESSAGES_DIR, canonicalFile), "utf8")),
);
const sourceKeys = new Set(Object.keys(sourceFlat));

// ICU sanity over the canonical source (every translation derives from it).
for (const [key, value] of Object.entries(sourceFlat)) {
  for (const p of icuProblems(value))
    errors.push(`${canonicalFile}: key "${key}" — ${p}`);
}

// Key parity: every other catalog must have exactly the canonical key set, and valid ICU.
for (const file of catalogs) {
  if (file === canonicalFile) continue;
  const flat = flatten(
    JSON.parse(readFileSync(join(MESSAGES_DIR, file), "utf8")),
  );
  const keys = new Set(Object.keys(flat));
  for (const k of sourceKeys)
    if (!keys.has(k))
      errors.push(`${file}: missing key "${k}" (present in ${canonicalFile})`);
  for (const k of keys)
    if (!sourceKeys.has(k))
      errors.push(
        `${file}: extra key "${k}" (not in ${canonicalFile}; edit the source, ADR 0055)`,
      );
  for (const [key, value] of Object.entries(flat)) {
    for (const p of icuProblems(value))
      errors.push(`${file}: key "${key}" — ${p}`);
  }
}

if (errors.length) {
  console.error(
    `check-i18n: ${errors.length} problem(s) (ADR 0055 key parity / ICU):`,
  );
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}
const others = catalogs.length - 1;
console.log(
  `check-i18n: OK — canonical "${canonical}" + ${others} other locale(s); ` +
    `${sourceKeys.size} keys, ICU balanced.`,
);
