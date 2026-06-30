#!/usr/bin/env node
/**
 * Dev environment orchestrator — the implementation behind `npm run dev` (ADR 0024).
 *
 * One command brings up a production-faithful local environment in a deterministic
 * order, so nothing ever starts against a missing or stale dependency
 * (ADR 0021, 0023, 0022):
 *
 *   [1] Supabase local stack  — Postgres + Auth + API via the Supabase CLI (ADR 0022)
 *   [2] Generated DB types    — regenerate database.types.ts from the live schema (ADR 0015)
 *   [3] Environment variables — `vercel env pull` when linked, else a documented
 *                               manual / local-defaults fallback (ADR 0023, 0018)
 *   [4] Next.js dev server    — `next dev` (ADR 0023)
 *
 * Official platform CLIs only — there is no bespoke docker-compose here (ADR 0021).
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// Put node_modules/.bin on PATH so `supabase` / `next` resolve whether this script is
// launched via `npm run dev` (npm adds .bin itself) or directly as `node scripts/dev.mjs`.
const BIN = path.resolve(process.cwd(), "node_modules", ".bin");
const ENV = {
  ...process.env,
  PATH: `${BIN}${path.delimiter}${process.env.PATH ?? ""}`,
};

// ── tiny styled logging ────────────────────────────────────────────────────────
const useColor = process.stdout.isTTY && process.env.NO_COLOR === undefined;
const paint = (code, s) => (useColor ? `[${code}m${s}[0m` : s);
const bold = (s) => paint("1", s);
const dim = (s) => paint("2", s);
const cyan = (s) => paint("36", s);
const yellow = (s) => paint("33", s);
const red = (s) => paint("31", s);

const TOTAL = 4;
const step = (n, title) =>
  console.log(`\n${cyan(bold(`[${n}/${TOTAL}]`))} ${bold(title)}`);
const info = (msg) => console.log(`      ${msg}`);
const warn = (msg) => console.log(`      ${yellow("!")} ${msg}`);

/** Abort the orchestrator with a styled, actionable message. */
function die(msg) {
  console.error(`\n${red(bold("✗ dev:"))} ${msg}\n`);
  process.exit(1);
}

/**
 * Run a command inheriting stdio. Aborts (→ die) on a non-zero exit unless
 * `allowFail` is set, in which case the exit code is returned to the caller.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ allowFail?: boolean }} [opts]
 * @returns {number} the process exit code
 */
function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", env: ENV });
  if (res.error) {
    if (opts.allowFail) return 127;
    die(`failed to launch \`${cmd}\`: ${res.error.message}`);
  }
  const code = res.status ?? 1;
  if (code !== 0 && !opts.allowFail) {
    die(`\`${cmd} ${args.join(" ")}\` exited with code ${code}`);
  }
  return code;
}

/**
 * Run a command capturing stdout; never throws.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @returns {{ code: number, stdout: string }}
 */
function capture(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: "utf8", env: ENV });
  return { code: res.status ?? 1, stdout: res.stdout ?? "" };
}

// ── [1] local Supabase stack (ADR 0022) ─────────────────────────────────────────
function ensureSupabase() {
  step(1, "Supabase local stack");
  // `supabase status` exits 0 only when the stack is already up — a cheap idempotency
  // check so re-running `npm run dev` does not pay the start cost a second time.
  if (capture("supabase", ["status"]).code === 0) {
    info(dim("already running — skipping start"));
    return;
  }
  info("starting (requires Docker)…");
  if (run("supabase", ["start"], { allowFail: true }) !== 0) {
    die(
      "Supabase failed to start — see the CLI output above for the cause. Common ones:\n" +
        "      • Docker isn't running → start Docker Desktop.\n" +
        "      • Another Supabase project holds the ports → free them with\n" +
        `        ${bold("supabase stop --project-id <other>")} (the message above names it).\n` +
        `      Then re-run ${bold("npm run dev")}.`,
    );
  }
}

// ── [2] generated DB types (ADR 0015) ───────────────────────────────────────────
function genTypes() {
  step(2, "Generate database types");
  run("npm", ["run", "gen:types"]);
  info(dim("src/lib/supabase/database.types.ts is in sync with the schema"));
}

// ── [3] environment variables (ADR 0023, 0018) ──────────────────────────────────
/**
 * Resolve environment variables before the app boots.
 *
 * Two situations:
 *
 *   • LINKED   — `.vercel/project.json` exists (someone ran `vercel login` +
 *     `vercel link`). The Vercel project's *development* environment is the source
 *     of truth; pulling it into `.env.local` makes local runs resolve env the way
 *     production does. The command is roughly:
 *         vercel env pull .env.local --environment=development --yes
 *
 *   • UNLINKED — no Vercel linkage. The app still runs: src/lib/env.ts ships local
 *     defaults (local Supabase URL/key, localhost origin), and a contributor may
 *     hand-author `.env.local` from .env.example. Env sync is a CONVENIENCE here,
 *     not a hard prerequisite — ADR 0023 explicitly preserves the unlinked path.
 *
 * ┌─ YOUR DECISION ──────────────────────────────────────────────────────────────┐
 * │ Implement the policy for both branches. The real judgement call is the         │
 * │ FAILURE MODE of the linked path: when `.vercel/project.json` exists but         │
 * │ `vercel env pull` fails (not logged in, offline, token expired) — should        │
 * │ `npm run dev` ABORT (die) so nobody develops against stale/missing env, or       │
 * │ WARN and continue on whatever `.env.local` / local defaults already exist, so   │
 * │ a transient Vercel outage never blocks local work? Freshness/safety vs.          │
 * │ resilience — pick one and own it.                                               │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * In scope: run(cmd, args, { allowFail }) → exit code, info(msg), warn(msg),
 * die(msg), existsSync(p), path, ENV.
 */
function syncEnv() {
  step(3, "Environment variables");
  const linked = existsSync(
    path.resolve(process.cwd(), ".vercel", "project.json"),
  );

  // TODO(you): implement the LINKED pull + UNLINKED fallback described above,
  //            including your chosen failure policy for a failed `vercel env pull`.
  void linked;
  warn(
    "syncEnv() is a placeholder — running on local defaults until it is implemented",
  );
}

// ── [4] Next.js dev server (ADR 0023) ────────────────────────────────────────────
function startNext() {
  step(4, "Next.js dev server");
  info(dim("handing off to `next dev` — Ctrl-C to stop\n"));
  const child = spawn("next", ["dev", "--port", "20000"], {
    stdio: "inherit",
    env: ENV,
  });
  // Forward termination so Ctrl-C stops next dev cleanly and we exit with its status.
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
  child.on("error", (err) =>
    die(`failed to launch \`next dev\`: ${err.message}`),
  );
}

console.log(
  bold("\n▸ capcom — local dev environment") +
    dim("\n  (ADR 0024: Supabase → types → env → next dev)"),
);
ensureSupabase();
genTypes();
syncEnv();
startNext();
