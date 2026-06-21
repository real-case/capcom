#!/usr/bin/env node
// scripts/check-figma-seals.mjs
//
// ADR 0063 — the Figma drift-seal fitness function (problem P9). After a 👤 approves a
// variant against its real Figma frame (the figma server's IMAGE capability, never its
// code path), the only trace left in `design-intent.ts` is an `ApprovalSeal`
// (`renderHash` + `figmaFileVersion`). This gate is the drift DETECTOR: it would
// re-render each sealed node by id and compare `renderHash` — a mismatch means the
// design moved and re-opens the variant for re-approval.
//
// INERT-UNTIL-FIGMA (bootstrap-lean, mirroring the Chromatic/e2e deferrals): no Figma
// file is wired for this repo and approval is human-only, so every `seal` is `null`
// today. This script therefore:
//   • validates the SHAPE of any non-null seal (so a malformed seal can't ship), and
//   • reports how many sealed nodes WOULD be re-rendered — the live hash compare needs
//     the figma MCP server (`get_screenshot`), which a plain Node script cannot call,
//     so it is performed in the approval/CI step that has the server, not here.
// With zero seals it exits 0 cleanly; it activates automatically when seals appear.

import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const UI_DIR = join(repoRoot, "src/components/ui");

const errors = [];
let sealed = 0;

/** A well-formed ApprovalSeal: non-empty strings + an ISO-ish approvedAt (ADR 0063). */
function validateSeal(where, seal) {
  sealed++;
  for (const field of ["figmaFileVersion", "renderHash", "approvedAt"]) {
    if (typeof seal[field] !== "string" || !seal[field].trim())
      errors.push(`${where}: seal.${field} must be a non-empty string.`);
  }
  if (seal.approvedAt && Number.isNaN(Date.parse(seal.approvedAt)))
    errors.push(
      `${where}: seal.approvedAt "${seal.approvedAt}" is not a parseable date.`,
    );
}

const intentFiles = readdirSync(UI_DIR).filter((f) =>
  f.endsWith(".design-intent.ts"),
);
for (const file of intentFiles) {
  const id = file.replace(".design-intent.ts", "");
  const mod = await import(pathToFileURL(join(UI_DIR, file)).href);
  const intent = Object.values(mod)[0];

  for (const v of intent.variants.items)
    if (v.seal) validateSeal(`${id} variant "${v.name}"`, v.seal);
  for (const s of intent.states)
    if (s.seal) validateSeal(`${id} state "${s.name}"`, s.seal);
}

if (errors.length) {
  console.error(`figma-seals: ${errors.length} malformed seal(s) (ADR 0063):`);
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}
if (sealed === 0) {
  console.log(
    `figma-seals: OK — 0 seals present (inert until a 👤 approves variants against real ` +
      `Figma frames, ADR 0063/0046). The live re-render hash compare runs in the approval ` +
      `step that holds the figma server, not in this Node gate.`,
  );
} else {
  console.log(
    `figma-seals: OK — ${sealed} seal(s) well-formed. Re-render hash compare runs in the ` +
      `figma-server step (this gate validates shape + presence).`,
  );
}
