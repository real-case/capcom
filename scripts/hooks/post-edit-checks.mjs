#!/usr/bin/env node
// scripts/hooks/post-edit-checks.mjs
//
// PostToolUse hook (Claude Code). Runs the fast, file-scoped half of the local gate the
// moment a file is written, so a formatting drift or a design-token violation surfaces
// HERE in the agent loop instead of later in CI. The CI gate (ADR 0010) stays the
// guarantee; this only shortens the loop.
//
//   • Always: `prettier --write` the edited file (matches `npm run format`;
//     --ignore-unknown + .prettierignore make non-formattable paths a no-op).
//   • Codegen-drift reminders (NON-blocking): editing a source that owns a GENERATED
//     artifact silently staledates it. globals.css (@theme) → `gen:tokens`;
//     supabase/migrations/**.sql → `gen:types`. These are not violations of the edited
//     file — there is nothing to fix there, only a follow-up gen step to run — so they
//     surface to Claude via `additionalContext` and exit 0, never exit 2. Neither
//     generator runs here: `gen:types` needs a live local Supabase stack (Docker), and
//     silently mutating generated files mid-edit is more surprising than a one-line nudge.
//   • For src/components/**.ts(x): run ESLint on just that file — this is the ADR 0058
//     token gate (`npm run check:tokens` over the same tree). A violation exits 2 so
//     Claude sees the message and fixes it before CI does.
//   • For src/components/ui/<id>.{stories.tsx,design-intent.ts}: run the SCOPED
//     design-intent fitness functions (`check-design-intent.mjs --component <id>`,
//     ADR 0062) and surface a failure as a NON-blocking nudge. Nudge, not exit-2: the
//     invariant spans the quartet (spec ↔ source ↔ stories), so a red mid-scaffold is
//     EXPECTED while the new-component ceremony is still in progress — blocking would
//     thrash the loop. Runs LAST: surfaceContext() exits the process, so it must not
//     swallow the token gate above.
//
// Fails OPEN on any unexpected error — a convenience hook must never brick the session.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, relative, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const bin = (name) => join(repoRoot, "node_modules", ".bin", name);

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// Surface a non-blocking follow-up to Claude (drift reminders). PostToolUse reads
// `hookSpecificOutput.additionalContext` from stdout on a clean exit (0) — unlike the
// exit-2 token gate, this informs without blocking or implying the edit was wrong.
function surfaceContext(message) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: message,
      },
    }),
  );
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(readStdin() || "{}");
} catch {
  process.exit(0);
}

const filePath = payload.tool_input?.file_path;
if (!filePath || typeof filePath !== "string") process.exit(0);

const abs = resolve(filePath);
if (!existsSync(abs) || !statSync(abs).isFile()) process.exit(0);
const relPosix = relative(repoRoot, abs).split(sep).join("/");

// 1. Format the file in place (no-op on ignored/unknown types).
try {
  execFileSync(bin("prettier"), ["--write", "--ignore-unknown", abs], {
    cwd: repoRoot,
    stdio: ["ignore", "ignore", "ignore"],
  });
} catch {
  // prettier failing mid-edit (e.g. a transient syntax error) is not this hook's job.
}

// 2. Codegen-drift reminders — non-blocking. A source edit here owns a generated
//    artifact a separate `gen:*` step rebuilds; flag the follow-up, do not run it.

// 2a. The @theme token layer → the generated token registry (ADR 0058).
if (relPosix === "src/app/globals.css") {
  surfaceContext(
    "src/app/globals.css changed — its @theme layer is the single source for the " +
      "generated token registry. Run `npm run gen:tokens` to refresh " +
      "tokens.generated.ts / tokens.allowlist.json / tokens.agent-rules.md and stage " +
      "the result; CI drift-checks these against globals.css (ADR 0058).",
  );
}

// 2b. A migration → the generated Supabase types (ADR 0014/0015). The CI
//     migration-replay + type-drift check is deferred during bootstrap, so this
//     local nudge is currently the only automated drift signal.
if (/^supabase\/migrations\/.+\.sql$/.test(relPosix)) {
  surfaceContext(
    `${relPosix} changed — src/lib/supabase/database.types.ts is now stale. Run ` +
      "`npm run gen:types` (needs the local Supabase stack up: `npx supabase start`) " +
      "and stage the regenerated types. The CI type-drift check is deferred during " +
      "bootstrap, so this is currently the only automated signal (ADR 0014/0015).",
  );
}

// 3. Token / lint gate for components only (ADR 0058). Surface violations to Claude.
const isComponentSource =
  relPosix.startsWith("src/components/") && /\.(ts|tsx)$/.test(relPosix);
if (isComponentSource) {
  try {
    execFileSync(bin("eslint"), [abs], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
    // ESLint exit 1 = lint problems found — a real token/lint violation; block.
    // Exit 2 (or no status: missing binary, bad config) = ESLint failed to RUN,
    // which is NOT a violation of the edited file. Misreporting a crash as a token
    // error would point Claude at the wrong fix, so only status 1 exits 2; a crash
    // fails open with a neutral note, per this hook's never-brick-the-session contract.
    if (err.status === 1 && out) {
      process.stderr.write(
        `Design-token / lint gate (ADR 0058) flagged ${relPosix}:\n\n${out}\n\n` +
          `Use a semantic token from src/design-system/tokens.agent-rules.md — never a ` +
          `raw hex/size literal, inline-style raw value, raw SVG fill/stroke, or numbered ` +
          `Tailwind class. This same rule fails \`npm run lint\` in CI.\n`,
      );
      process.exit(2);
    }
    if (err.status === 2) {
      process.stderr.write(
        `post-edit-checks: ESLint could not run over ${relPosix} (exit 2 — config or ` +
          `internal error, not a lint finding). Skipping the token gate for this edit; ` +
          `\`npm run lint\` still gates it in CI.${out ? `\n${out}` : ""}\n`,
      );
    }
    // Any other throw (ENOENT / undefined status) → fall through and fail open.
  }
}

// 4. Scoped design-intent fitness check for the component quartet (ADR 0062). Last —
//    surfaceContext() exits the process.
//
//    The gate imports .ts registries via Node 24 type-stripping, but hooks inherit the
//    SHELL-DEFAULT runtime (possibly Node 22, where the import crashes with
//    ERR_UNKNOWN_FILE_EXTENSION). So: pick a capable runtime first (own, else the
//    nvm-installed 24.x per .nvmrc), and surface ONLY a real gate report — a runtime
//    crash is not a violation of the edited file and fails open (CI still gates).
function gateCapableNode() {
  if (Number(process.versions.node.split(".")[0]) >= 24)
    return process.execPath;
  try {
    const nvmDir = join(process.env.HOME ?? "", ".nvm/versions/node");
    const best = readdirSync(nvmDir)
      .map((v) => v.match(/^v24\.(\d+)\.(\d+)$/))
      .filter(Boolean)
      .sort(
        (a, b) => Number(a[1]) - Number(b[1]) || Number(a[2]) - Number(b[2]),
      )
      .at(-1);
    if (best) {
      const bin = join(nvmDir, best[0], "bin", "node");
      if (existsSync(bin)) return bin;
    }
  } catch {
    // fall through — no capable runtime found
  }
  return null;
}

const quartet = relPosix.match(
  /^src\/components\/ui\/(.+)\.(?:stories\.tsx|design-intent\.ts)$/,
);
if (quartet) {
  const componentId = quartet[1];
  const nodeBin = gateCapableNode();
  if (nodeBin) {
    try {
      execFileSync(
        nodeBin,
        [
          "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
          "scripts/check-design-intent.mjs",
          "--component",
          componentId,
        ],
        { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
      );
    } catch (err) {
      const out = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
      // Only a real gate report (its output is prefixed) — never a runtime crash.
      if (out.includes("design-intent:")) {
        surfaceContext(
          `check:design-intent (scoped to "${componentId}") is red after this edit:\n\n` +
            `${out}\n\nThis is a cross-file invariant (spec ↔ source ↔ stories, ` +
            `ADR 0062) — a red mid-scaffold is expected while the quartet is incomplete. ` +
            `Finish the component's quartet, then re-run \`npm run check:design-intent\`.`,
        );
      }
      // Anything else (version skew, ENOENT) → fail open; CI still gates it.
    }
  }
}

process.exit(0);
