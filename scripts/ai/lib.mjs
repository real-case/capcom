// scripts/ai/lib.mjs
//
// Shared helpers for the Phase-12 ADVISORY AI jobs (ADRs 0048–0057). Every job is
// advisory (it never blocks a merge — ADR 0047/0048), ADR-grounded (it cites record
// numbers), and INERT until a 👤 provisions AI_API_KEY (ADR 0046/0044) — the same
// inert-until-token posture as the Chromatic token. With no key, each job no-ops cleanly
// (the workflow also gates on a has-key job, so the script never even runs).
//
// PROVIDER-AGNOSTIC (ADR 0075): talks the OpenAI-compatible Chat Completions shape over
// Node 24's global `fetch` (ADR 0004) — no vendor SDK. Point it at any provider with three
// env vars:
//   AI_API_KEY   the key (gates inertness)            — a 👤-provisioned secret
//   AI_BASE_URL  the OpenAI-compatible base, e.g. Gemini:
//                https://generativelanguage.googleapis.com/v1beta/openai
//   AI_MODEL     e.g. gemini-2.5-flash | gpt-4.1-mini | claude-… (provider's id)
// The template ships neutral (no default provider); .env.example documents Gemini as the
// worked example with OpenAI / Anthropic-compat alternatives.
//
// Grounding is CLAUDE.md + the decisions index, sent as the system message so the model can
// cite ADR numbers. (Vendor-specific prompt caching / reasoning-effort knobs are out of
// scope here per ADR 0075 — the common OpenAI-compatible subset only.)

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

export const MODEL = process.env.AI_MODEL || "";
// Output-token budget. Kept conservative by default (some models cap their max output),
// but tunable per provider via the AI_MAX_TOKENS variable — a REASONING model spends this
// budget on hidden thinking before any visible content, so a small cap can yield an empty
// `content` (finish_reason "length"). Raise it for such models; `advise()` logs the
// finish_reason on an empty completion so the operator can tell when this is the cause.
const MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 8000);

/** True only when a non-empty key is present (ADR 0046 — human-provisioned). */
export function hasKey() {
  return Boolean(process.env.AI_API_KEY?.trim());
}

/**
 * Exit 0 with an inert note when no key — the double-guard beneath the workflow gate.
 * When a key IS present but the rest of the contract is missing, fail loudly (the operator
 * clearly intends to run): point them at the AI_BASE_URL / AI_MODEL they still owe.
 */
export function requireKeyOrExitInert(job) {
  if (!hasKey()) {
    console.log(
      `${job}: inert — no AI_API_KEY (👤-provisioned, ADR 0046/0044). ` +
        `Add it as a GitHub Actions secret to activate this advisory job.`,
    );
    process.exit(0);
  }
  const missing = ["AI_BASE_URL", "AI_MODEL"].filter(
    (k) => !process.env[k]?.trim(),
  );
  if (missing.length) {
    console.error(
      `${job}: AI_API_KEY is set but ${missing.join(" + ")} ${missing.length > 1 ? "are" : "is"} not — ` +
        `set the provider endpoint + model (see .env.example; e.g. Gemini's OpenAI-compatible base). ADR 0075.`,
    );
    process.exit(1);
  }
  return true;
}

/** The ADR grounding: CLAUDE.md (summarizes every record) + the decisions index. */
export function adrGrounding() {
  const parts = [];
  for (const p of ["CLAUDE.md", "docs/decisions/README.md"]) {
    if (existsSync(p))
      parts.push(`===== ${p} =====\n${readFileSync(p, "utf8")}`);
  }
  return parts.join("\n\n");
}

/** Read the full text of specific ADRs by number (e.g. for a targeted security pass). */
export function readAdrs(numbers) {
  const out = [];
  for (const n of numbers) {
    const id = String(n).padStart(4, "0");
    const match = execSync(`ls docs/decisions/${id}-*.md 2>/dev/null || true`, {
      encoding: "utf8",
    }).trim();
    if (match) out.push(`===== ${match} =====\n${readFileSync(match, "utf8")}`);
  }
  return out.join("\n\n");
}

/** Diff of the current branch against its base (PR base ref, or a provided range). */
export function getDiff() {
  const base = process.env.DIFF_BASE || process.env.GITHUB_BASE_REF;
  try {
    if (base) {
      execSync(`git fetch --no-tags --depth=1 origin ${base}`, {
        stdio: "ignore",
      });
      return execSync(`git diff --no-color origin/${base}...HEAD`, {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
    }
    return execSync(`git diff --no-color HEAD~1...HEAD`, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    console.error("could not compute diff:", err.message);
    return "";
  }
}

const SYSTEM_INSTRUCTIONS =
  "You are an ADVISORY reviewer for this repository. Your output is a suggestion, never a " +
  "gate (ADR 0047/0048): a human always decides. Ground every point in the project's accepted " +
  "ADRs and CITE the record number(s) you rely on (e.g. “ADR 0058”). Be concise, specific, and " +
  "actionable; prefer a short bulleted list over prose. If you find nothing worth raising, say " +
  "so in one line rather than inventing findings.";

/** One non-streaming completion turn. Throws on a non-2xx; returns the choice details. */
async function completionTurn({ grounding, task, payload }) {
  const baseUrl = process.env.AI_BASE_URL.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: `${SYSTEM_INSTRUCTIONS}\n\nProject decision context (ADR corpus summary):\n\n${grounding}`,
        },
        { role: "user", content: `${task}\n\n${payload}` },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `AI request failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`,
    );
  }
  const json = await res.json();
  const choice = json.choices?.[0];
  const content = choice?.message?.content;
  return {
    text: (typeof content === "string" ? content : "").trim(),
    finishReason: choice?.finish_reason,
    usage: json.usage,
  };
}

/**
 * Run one advisory turn against any OpenAI-compatible Chat Completions endpoint (ADR 0075).
 * Grounding + instructions go in the system message; `task` + `payload` are the user turn.
 * Returns the final text — or `""` when the provider returns a 200 with no content (a
 * reasoning model exhausting `max_tokens`, a content filter, or a throttled free gateway
 * all surface this way). On empty it logs the finish_reason + usage so the cause is
 * diagnosable from the job log, and retries once (a transient empty is common on free
 * gateways); the caller then decides whether to skip posting. Non-streaming — advisory
 * outputs are small and posted as a comment.
 *
 * Note: a few compat layers differ at the edges — e.g. OpenAI's o-series wants
 * `max_completion_tokens` instead of `max_tokens`. The common subset (Gemini, OpenAI chat
 * models, OpenRouter, Groq, Anthropic-compat) accepts what is sent here.
 */
export async function advise(args) {
  const attempts = 2;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { text, finishReason, usage } = await completionTurn(args);
    if (text) return text;
    console.warn(
      `advise: empty completion (attempt ${attempt}/${attempts}, ` +
        `finish_reason=${finishReason ?? "?"}, usage=${JSON.stringify(usage ?? {})}). ` +
        (finishReason === "length"
          ? "The model hit max_tokens before emitting content — raise AI_MAX_TOKENS (reasoning models need headroom). "
          : "") +
        (attempt < attempts
          ? "Retrying once…"
          : "Giving up; the caller will skip posting."),
    );
    if (attempt < attempts) await new Promise((r) => setTimeout(r, 1500));
  }
  return "";
}

/** Post a comment on a PR via the gh CLI (advisory — no required-check status). */
export function postPrComment(prNumber, body) {
  if (!prNumber) {
    console.log("(no PR number — printing advisory below)\n");
    console.log(body);
    return;
  }
  execSync(`gh pr comment ${prNumber} --body-file -`, {
    input: body,
    stdio: ["pipe", "inherit", "inherit"],
  });
}
