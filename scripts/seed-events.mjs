#!/usr/bin/env node
// scripts/seed-events.mjs
//
// PR-3 / ADR 0085 — the seed generator. ADR 0085 splits intake into two paths:
// the `/api/ingest` route *proves the contract*, and this generator *supplies the
// data volume*. It is the second one: a dense, deterministic, multi-project body
// of events + tracked-user profiles so the PR-4+ aggregations (trends, funnels,
// retention, segments — ADR 0084) have real signal to reduce.
//
// It writes directly under the service-role (the same trusted credential the
// ingest route uses), NOT through the HTTP route — generating tens of thousands of
// rows over the wire would be slow and is explicitly outside the seeded-demo scope
// (ADR 0085). Isolation is still honored: every row is stamped with one of the
// seeded project_ids and nothing else.
//
// Deterministic: a seeded PRNG (mulberry32) means re-runs reproduce the same data,
// and the script is idempotent — it clears the demo projects' events/profiles
// first, so running it twice does not double the volume.
//
// Usage (after `npm run db:reset`, with the local stack up):
//   npm run seed:events
// Credentials are auto-detected from the local stack (`supabase status`); override
// with SUPABASE_URL / SUPABASE_SECRET_KEY for a non-local target.

import { execSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

// ── Seeded projects (must match supabase/seed.sql) ────────────────────────────
// usersPerProject sizes the volume; the event model below yields ~30–60 events
// per user, so these add up to a dense but fast-to-insert body (~15k events).
const PROJECTS = [
  {
    id: "0a000000-0000-0000-0000-0000000000a1",
    slug: "aurora-web",
    users: 160,
  },
  {
    id: "0a000000-0000-0000-0000-0000000000a2",
    slug: "aurora-mobile",
    users: 110,
  },
  { id: "0b000000-0000-0000-0000-0000000000b1", slug: "globex-mkt", users: 90 },
];

const DAYS_WINDOW = 90; // events spread across the trailing 90 days (trends).
const INSERT_CHUNK = 500; // rows per insert call.

// ── Domain vocabularies ───────────────────────────────────────────────────────
const PLANS = ["free", "free", "free", "pro", "pro", "enterprise"]; // weighted.
const COUNTRIES = ["US", "US", "GB", "DE", "FR", "CA", "IN", "BR", "JP", "AU"];
const DEVICES = ["desktop", "desktop", "mobile", "mobile", "tablet"];
const REFERRERS = ["organic", "google", "twitter", "newsletter", "direct"];
const PAGES = ["/", "/pricing", "/features", "/blog", "/docs", "/changelog"];
const FEATURES = ["dashboard", "funnel", "retention", "segments", "export"];
const SEARCH_TERMS = ["analytics", "funnel", "cohort", "pricing", "api", "sso"];

// ── Deterministic RNG ─────────────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const chance = (rng, p) => rng() < p;
const intBetween = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

/** A timestamp `daysAgo` days back, at a random hour/minute, as an ISO string. */
function isoDaysAgo(rng, daysAgo) {
  const base = Date.now() - daysAgo * 86_400_000;
  const jitter = Math.floor(rng() * 86_400_000); // somewhere within that day.
  return new Date(base - jitter).toISOString();
}

// ── Per-user event sequence: a realistic acquisition → activation → revenue
// funnel with retention, so funnels and cohorts (ADR 0084) have shape. ───────────
function generateUser(project, index) {
  const rng = mulberry32(hashSeed(`${project.slug}:${index}`));
  const distinctId = `${project.slug}_u${String(index).padStart(4, "0")}`;

  const plan = pick(rng, PLANS);
  const country = pick(rng, COUNTRIES);
  const device = pick(rng, DEVICES);
  const referrer = pick(rng, REFERRERS);

  const firstSeenDaysAgo = intBetween(rng, 1, DAYS_WINDOW);
  const events = [];
  const push = (eventName, daysAgo, properties = {}) =>
    events.push({
      project_id: project.id,
      event_name: eventName,
      distinct_id: distinctId,
      properties: { plan, country, device, ...properties },
      ts: isoDaysAgo(rng, daysAgo),
    });

  // Acquisition: a landing page_view on the first day; most sign up.
  push("page_view", firstSeenDaysAgo, { path: pick(rng, PAGES), referrer });
  const signedUp = chance(rng, 0.72);
  if (signedUp) push("sign_up", firstSeenDaysAgo, { referrer });

  // Activation + retention: return visits over subsequent days, each a small
  // burst of in-app events. Non-signups churn fast; signups stick longer.
  const activeDays = signedUp ? intBetween(rng, 1, 12) : intBetween(rng, 0, 2);
  let lastSeenDaysAgo = firstSeenDaysAgo;
  for (let d = 0; d < activeDays; d++) {
    const dayDaysAgo = Math.max(
      0,
      firstSeenDaysAgo - intBetween(rng, 1, firstSeenDaysAgo),
    );
    lastSeenDaysAgo = Math.min(lastSeenDaysAgo, dayDaysAgo);
    const burst = intBetween(rng, 1, 6);
    for (let b = 0; b < burst; b++) {
      const roll = rng();
      if (roll < 0.4) push("page_view", dayDaysAgo, { path: pick(rng, PAGES) });
      else if (roll < 0.6)
        push("search", dayDaysAgo, { term: pick(rng, SEARCH_TERMS) });
      else push("feature_used", dayDaysAgo, { feature: pick(rng, FEATURES) });
    }
    // Revenue: a fraction of paid-intent users convert on a return visit.
    if (signedUp && plan !== "free" && chance(rng, 0.25)) {
      push("purchase", dayDaysAgo, {
        amount: pick(rng, [19, 49, 99, 199]),
        currency: "USD",
      });
    }
  }

  const profile = {
    project_id: project.id,
    distinct_id: distinctId,
    traits: { plan, country, device, referrer },
    first_seen_at: isoDaysAgo(rng, firstSeenDaysAgo),
    last_seen_at: isoDaysAgo(rng, lastSeenDaysAgo),
  };

  return { profile, events };
}

/** Stable 32-bit seed from a string (so a project+index always yields the same user). */
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── Credentials (auto-detected from the local stack; env overrides) ───────────
function resolveCredentials() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "http://127.0.0.1:54321";
  let secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    try {
      const out = execSync("npx supabase status -o json", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      secret = JSON.parse(out).SECRET_KEY;
    } catch {
      // Fall through to the error below.
    }
  }
  if (!secret) {
    console.error(
      "[seed-events] No service-role key. Start the local stack and retry, or set\n" +
        "  SUPABASE_SECRET_KEY=$(npx supabase status -o json | jq -r .SECRET_KEY)",
    );
    process.exit(1);
  }
  return { url, secret };
}

async function insertChunked(supabase, table, rows) {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(
        `[seed-events] insert into ${table} failed:`,
        error.message,
      );
      process.exit(1);
    }
  }
}

async function main() {
  const { url, secret } = resolveCredentials();
  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const projectIds = PROJECTS.map((p) => p.id);

  // Idempotency: clear the demo projects' analytics rows before regenerating.
  // distinct_id is not a FK, so order is immaterial; events first by convention.
  for (const table of ["events", "profiles"]) {
    const { error } = await supabase
      .from(table)
      .delete()
      .in("project_id", projectIds);
    if (error) {
      console.error(`[seed-events] clearing ${table} failed:`, error.message);
      process.exit(1);
    }
  }

  let totalEvents = 0;
  let totalProfiles = 0;
  for (const project of PROJECTS) {
    const profiles = [];
    const events = [];
    for (let i = 0; i < project.users; i++) {
      const { profile, events: userEvents } = generateUser(project, i);
      profiles.push(profile);
      events.push(...userEvents);
    }
    await insertChunked(supabase, "profiles", profiles);
    await insertChunked(supabase, "events", events);
    totalProfiles += profiles.length;
    totalEvents += events.length;
    console.log(
      `[seed-events] ${project.slug}: ${profiles.length} profiles, ${events.length} events`,
    );
  }

  console.log(
    `[seed-events] done — ${totalProfiles} profiles, ${totalEvents} events across ${PROJECTS.length} projects.`,
  );
}

main().catch((err) => {
  console.error("[seed-events] unexpected failure:", err);
  process.exit(1);
});
