-- PR-3 / ADR 0083, 0085: the analytics domain on top of the tenancy spine —
-- tracked end-users (profiles), the event stream (events), and the per-project
-- ingest credential (project_ingest_keys).
--
-- Isolation stays a DATABASE invariant (ADR 0013): every domain row carries
-- project_id and reaches a member-reader only through the membership join that
-- PR-2 centralized in public.is_member(project_id). RLS is written in this
-- migration so the security model is versioned with the schema (ADR 0014).
--
-- Two write paths, deliberately split (ADR 0083 / 0085):
--   • Members never INSERT here — events and profiles are read-only to the app.
--     There are no member write policies, and authenticated holds only SELECT.
--   • Writes arrive through the ingest route (ADR 0085) under the service-role
--     (RLS-bypassing) credential, confined server-side to the project_id the
--     ingest key resolves to. The trusted role gets the write GRANTs below.
--
-- The auth-user (a member who logs in) is NOT the tracked end-user: profiles is
-- keyed by (project_id, distinct_id) and never references auth.users (ADR 0083).

-- ---------------------------------------------------------------------------
-- profiles — the tracked end-user within a project (ADR 0083).
-- Identity is (project_id, distinct_id): the same distinct_id in two projects is
-- two different tracked users, and the table never collapses into auth.users.
-- The ingest path materializes/refreshes a profile row from the event stream;
-- the seed generator populates them directly. `traits` holds user properties.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- The end-user's stable identifier as the emitting product knows them. Bounded
  -- like every other user-supplied string; never a uuid/FK to auth.users.
  distinct_id text not null check (char_length(distinct_id) between 1 and 200),
  -- User properties ("traits"): an open bag set/merged by the emitter. Defaults
  -- to an empty object so a profile materialized from a bare event is still valid.
  traits jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One profile per tracked user per project. Also the lookup index the ingest
  -- upsert and the member read path hit (project_id-leading).
  unique (project_id, distinct_id)
);

comment on table public.profiles is
  'Tracked end-user keyed by (project_id, distinct_id) (ADR 0083). Read-only to members under RLS; written only by the ingest path. Never conflated with auth.users.';

-- ---------------------------------------------------------------------------
-- events — the immutable analytics event stream (ADR 0083).
-- Append-only facts: a row is inserted once and never updated, so there is no
-- updated_at column or trigger. distinct_id is plain text (NOT a FK to profiles)
-- because an event may arrive before its profile is materialized and the two are
-- reconciled by (project_id, distinct_id), not by a foreign key.
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  event_name text not null check (char_length(event_name) between 1 and 200),
  distinct_id text not null check (char_length(distinct_id) between 1 and 200),
  -- Event properties: an open bag validated at the ingest boundary (ADR 0017),
  -- stored as-is for the in-database aggregations (ADR 0084) to read.
  properties jsonb not null default '{}'::jsonb,
  -- When the event happened (emitter clock), distinct from the row's create time.
  -- The ingest path defaults an absent ts to now() (ADR 0085); created_at records
  -- when the row landed.
  ts timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.events is
  'Immutable, append-only event stream (ADR 0083). Read-only to members under RLS; written only by the ingest path (ADR 0085). Reduced in-database by the aggregation layer (ADR 0084).';

-- Every query against events is project-scoped (RLS filters by project, and the
-- aggregations always pin a project), so each index leads with project_id:
--   (project_id, ts)         — trends / retention over a time window (ADR 0084).
--   (project_id, event_name) — funnels and per-event segment distributions.
--   (project_id, distinct_id)— per-user event lookups and retention cohorts.
create index events_project_id_ts_idx on public.events (project_id, ts desc);
create index events_project_id_event_name_idx on public.events (project_id, event_name);
create index events_project_id_distinct_id_idx on public.events (project_id, distinct_id);

-- ---------------------------------------------------------------------------
-- project_ingest_keys — the per-project ingest credential (ADR 0085).
-- Stores ONLY a hash of the bearer token (sha-256, hex) — the plaintext key is
-- shown once at provisioning and never persisted. The ingest route resolves an
-- incoming key to exactly one project_id by hashing it and matching here. The
-- table is touched only by the service-role (it bypasses RLS); members and anon
-- have no GRANT and the table carries no policy, so it is invisible to them.
-- Rotation/revocation is a human-only secret operation (ADR 0085/0046).
-- ---------------------------------------------------------------------------
create table public.project_ingest_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- sha-256(token) hex-encoded. Unique so a key resolves to at most one project.
  key_hash text not null unique,
  -- Optional human label to tell rotated keys apart in the (human-run) UI/SQL.
  label text check (label is null or char_length(label) between 1 and 120),
  created_at timestamptz not null default now(),
  -- Non-null once retired: the resolver matches `revoked_at is null` only.
  revoked_at timestamptz
);

comment on table public.project_ingest_keys is
  'Per-project ingest credential, stored hashed (ADR 0085). Service-role only — no member/anon GRANT, no RLS policy. Rotation is human-only (ADR 0046).';

-- ---------------------------------------------------------------------------
-- updated_at maintenance. profiles is mutable (ingest refreshes last_seen_at /
-- traits), so it reuses the generic trigger function from the tenancy migration
-- (INVOKER + pinned search_path). events is immutable and project_ingest_keys is
-- human-managed — neither needs one.
-- ---------------------------------------------------------------------------
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table privileges. SEPARATE from RLS: this GRANT decides whether a role may
-- touch the table at all; RLS then decides which rows.
--   • authenticated (members): SELECT only on events/profiles — the app reads,
--     never writes, the stream. No GRANT on project_ingest_keys.
--   • service_role (the trusted server-only writer, RLS-bypassing): the writes the
--     two server-side consumers need. The ingest route (ADR 0085) inserts events
--     and upserts profiles; the seed generator (scripts/seed-events.mjs, ADR 0085's
--     "data volume" path) additionally clears the demo projects' rows to stay
--     idempotent — hence DELETE. Plus SELECT on project_ingest_keys to resolve a
--     key to its project. service_role never reaches client code (ADR 0013).
--   • anon stays ungranted everywhere — the product is authenticated-only (ADR 0016).
-- ---------------------------------------------------------------------------
grant select on public.events to authenticated;
grant select on public.profiles to authenticated;

grant select, insert, delete on public.events to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select on public.project_ingest_keys to service_role;

-- ---------------------------------------------------------------------------
-- Deny-by-default RLS. RLS on + no policy = every row invisible; the SELECT
-- policies below grant scoped read access back through the membership join.
-- There are deliberately NO insert/update/delete policies: members never write
-- the analytics domain, and the service-role write path bypasses RLS entirely.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.project_ingest_keys enable row level security;

-- profiles ------------------------------------------------------------------
-- Read: any member of the project's organization (ADR 0083). is_member runs as
-- DEFINER (PR-2), so reading here does not recurse through RLS.
create policy "Members read profiles in their projects"
  on public.profiles for select
  to authenticated
  using (public.is_member(project_id));

-- events --------------------------------------------------------------------
-- Read: any member of the project's organization.
create policy "Members read events in their projects"
  on public.events for select
  to authenticated
  using (public.is_member(project_id));

-- project_ingest_keys -------------------------------------------------------
-- No policy by design: the table holds credential material and is reached only
-- by the service-role resolver, which bypasses RLS. Enabling RLS with zero
-- policies makes it deny-by-default invisible to authenticated and anon, who
-- also hold no GRANT — a double deny on a secrets-bearing table.
