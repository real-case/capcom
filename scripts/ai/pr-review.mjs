#!/usr/bin/env node
// scripts/ai/pr-review.mjs — ADR 0048 (AI PR review, advisory), folding in 0051
// (story-matrix drafting hints) and 0052 (semantic-a11y pass). Input = the PR diff +
// the ADR corpus; output = a comment that cites record numbers. Never a required check
// (ADR 0047/0048): a human review is always required and the AI never substitutes.

import {
  requireKeyOrExitInert,
  adrGrounding,
  getDiff,
  advise,
  postPrComment,
} from "./lib.mjs";

requireKeyOrExitInert("ai-pr-review");

const diff = getDiff();
if (!diff.trim()) {
  console.log("ai-pr-review: empty diff — nothing to review.");
  process.exit(0);
}

const review = await advise({
  grounding: adrGrounding(),
  task:
    "Review this pull-request diff as an advisory reviewer. Focus on: (1) violations of an " +
    "accepted ADR (cite the number); (2) correctness/security risks; (3) for any new or changed " +
    "component under src/components/**, whether its colocated stories cover the meaningful states " +
    "(ADR 0036/0042/0051 — draft a missing-state matrix if gaps exist) and whether a semantic-a11y " +
    "concern is visible in the markup (focus order, label clarity, state-beyond-color — ADR 0052). " +
    "Do NOT restate the diff. End with a one-line overall recommendation.",
  payload: `\`\`\`diff\n${diff.slice(0, 180000)}\n\`\`\``,
});

const body = `### [AI] Advisory review\n\n${review}`;
postPrComment(process.env.PR_NUMBER, body);
console.log("ai-pr-review: advisory posted.");
