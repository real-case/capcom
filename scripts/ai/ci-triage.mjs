#!/usr/bin/env node
// scripts/ai/ci-triage.mjs — ADR 0049 (CI-failure triage, advisory). Classifies a
// failed CI run as real regression / flaky / infra, WITH evidence. There is NO global
// retry policy (ADR 0049): a flake is quarantined explicitly (annotated skip + tracked
// issue + time-box), never papered over. This job only advises the classification; the
// quarantine action stays human.

import {
  requireKeyOrExitInert,
  adrGrounding,
  advise,
  postPrComment,
} from "./lib.mjs";
import { readFileSync, existsSync } from "node:fs";

requireKeyOrExitInert("ai-ci-triage");

// The workflow writes the failing job's log to ci-failure.log before invoking this.
const logPath = process.env.CI_LOG_PATH || "ci-failure.log";
const log = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
if (!log.trim()) {
  console.log("ai-ci-triage: no failure log found — nothing to triage.");
  process.exit(0);
}

const triage = await advise({
  grounding: adrGrounding(),
  task:
    "A CI run failed. Triage the failure into exactly one class — REAL REGRESSION, FLAKY, or " +
    "INFRA — and justify it with specific evidence from the log (the failing step, the assertion, " +
    "the error). If FLAKY, recommend the ADR-0049 quarantine (annotated skip + a tracked issue + a " +
    "time-box) and name the test — do NOT recommend a retry (there is no global retry policy). If " +
    "REAL, point at the likely cause. Keep it to a short, evidence-bearing summary.",
  payload: `Failing CI log (tail):\n\`\`\`\n${log.slice(-120000)}\n\`\`\``,
});

const body = `### [AI] Advisory CI-failure triage\n\n${triage}`;
postPrComment(process.env.PR_NUMBER, body);
console.log("ai-ci-triage: advisory posted.");
