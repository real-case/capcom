#!/usr/bin/env node
// scripts/ai/changelog.mjs — ADR 0050 (changelog drafting at the dev→main release).
// Drafts categorized entries from the commit range; the human EDITS them in the release
// PR (this never auto-commits CHANGELOG.md). Output is written to CHANGELOG.draft.md (a
// build artifact / PR comment), not to the committed changelog.

import {
  requireKeyOrExitInert,
  adrGrounding,
  advise,
  postPrComment,
} from "./lib.mjs";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

requireKeyOrExitInert("ai-changelog");

// Range: from the last tag (or main) to HEAD, configurable for the release PR.
const range = process.env.CHANGELOG_RANGE || "origin/main..HEAD";
let commits = "";
try {
  execSync("git fetch --no-tags --depth=200 origin main", { stdio: "ignore" });
  commits = execSync(
    `git log --no-merges --pretty=format:'- %s (%h)' ${range}`,
    {
      encoding: "utf8",
    },
  );
} catch (err) {
  console.error("ai-changelog: could not read commit range:", err.message);
}
if (!commits.trim()) {
  console.log("ai-changelog: no commits in range — nothing to draft.");
  process.exit(0);
}

const draft = await advise({
  grounding: adrGrounding(),
  task:
    "Draft release-changelog entries from these commit subjects. Group under the Keep-a-Changelog " +
    "headings (Added / Changed / Fixed / Removed / Security) and write user-facing, plain-language " +
    "lines — not raw commit subjects. Cite an ADR number only where a change implements a specific " +
    "decision. This is a DRAFT a human will edit in the release PR (ADR 0050); do not invent entries " +
    "for commits that aren't there.",
  payload: `Commits in ${range}:\n${commits}`,
});

writeFileSync("CHANGELOG.draft.md", `${draft}\n`);
const body = `### [AI] Advisory changelog draft\n\n${draft}`;
postPrComment(process.env.PR_NUMBER, body);
console.log(
  "ai-changelog: draft written to CHANGELOG.draft.md and posted (human edits in the release PR, ADR 0050).",
);
