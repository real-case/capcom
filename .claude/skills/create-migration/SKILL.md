---
name: create-migration
description: >-
  Scaffold a new Supabase SQL migration through the full row-security ceremony — generate
  the timestamped file with the Supabase CLI (ADR 0014), author schema + deny-by-default RLS
  from the proven create_notes template (RLS enabled, owner-scoped select/insert/update/delete,
  `to authenticated`, table GRANTs, search_path-pinned functions), apply it locally with
  db:reset, regenerate the typed client with gen:types (ADR 0015), and leave the auth/RLS
  critical path with a test (ADR 0007). Use when asked to "create/add a migration", "new
  table", "add a column", "write a Supabase migration", or "/create-migration <name>".
disable-model-invocation: true
---

# Scaffold a governed Supabase migration (row-security ceremony)

A migration here is a **security change versioned with the schema** (ADR 0014), not just a
DDL file: every user-reachable table ships its RLS in the same migration, isolation is
**deny-by-default**, and the typed client is regenerated so the app stays in sync (ADR 0015).
This skill walks that path and ends with the local DB rebuilt, types regenerated, and the
isolation model proven. It has side effects (writes SQL, resets the local DB, regenerates
types), so it is **user-invoked only**.

> Node 24 is required (`engines.node >=24 <25`). If `node -v` is not v24.x, prepend your
> Node 24 (the newest `~/.nvm/versions/node/v24.*/bin`) to `PATH` before any `npm run`.
> The local stack needs **Docker** running and **`npx supabase start`** up.

The canonical reference is the **`create_notes` template in step 2 below** — a
correctly-isolated per-user table. A fresh template ships no migrations yet; this skill
scaffolds the first one, so mirror that template's structure. Run the steps **in order**.

## 0. Decide the change
- **Name:** a verb-first slug — `create_<table>`, `add_<col>_to_<table>`, `add_rls_to_<table>`.
- **Scope check (👤 boundary):** the Supabase baseline is **Postgres + RLS + Auth only**
  (ADR 0012). **Storage, Realtime, Edge Functions each need their own ADR first** — if the
  change reaches for one, **stop and escalate to a human**; do not scaffold it here.
- **Ownership model:** who may see a row? Per-user (`user_id = auth.uid()`), per-tenant (a
  membership join), or service-only (no client access). This decides the policy predicates.

## 1. Generate the timestamped file with the CLI (ADR 0014)
Never hand-roll the timestamp — the Supabase CLI is the source of the migration ordering:

```bash
npx supabase migration new <name>     # → supabase/migrations/<UTC-timestamp>_<name>.sql
```

Open the created (empty) file and author it in step 2.

## 2. Author schema + RLS in ONE migration
For a **new user-owned table**, follow the template below — it is the create_notes model,
generalized. Every block is load-bearing; the inline `-- why` comments explain each. For an
**ALTER** (new column/constraint) the schema block shrinks, but the RLS rules in step 3 still
apply to any policy you add or any column that changes who can see a row.

```sql
-- <Phase / ADR refs>: <one line — what this table is and the isolation it proves>.
-- RLS is written here so the security model is versioned with the schema (ADR 0014).

create table public.<table> (
  id uuid primary key default gen_random_uuid(),
  -- Owner. Defaults to the caller so inserts may omit it; cascades on user deletion
  -- so rows never outlive their owner.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- … domain columns, with `check` bounds on user-supplied text (length caps) …
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.<table> is
  'User-owned <table>; RLS restricts every row to its owner (ADR 0013, 0014, 0016).';

-- Owner lookups (the only access path under RLS) hit this index.
create index <table>_user_id_idx on public.<table> (user_id);

-- Table privileges are SEPARATE from RLS: this GRANT decides whether the role may touch
-- the table at all; RLS then decides which rows. This Supabase version does not auto-grant
-- the API roles, so without it `authenticated` gets "permission denied" before any policy
-- runs. Anon stays ungranted — an authenticated-only resource (ADR 0016).
grant select, insert, update, delete on public.<table> to authenticated;

-- Deny-by-default: RLS on + no policy = every row invisible. Policies grant access back.
alter table public.<table> enable row level security;

-- `to authenticated` excludes anon; `(select auth.uid())` is evaluated once per statement
-- (initPlan) rather than per row.
create policy "Users can read their own <table>"
  on public.<table> for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own <table>"
  on public.<table> for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own <table>"
  on public.<table> for update
  to authenticated
  using ((select auth.uid()) = user_id)        -- which rows may be updated
  with check ((select auth.uid()) = user_id);  -- AND what they may become — both required

create policy "Users can delete their own <table>"
  on public.<table> for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- updated_at trigger: security INVOKER + pinned search_path (avoids the mutable-search_path
-- advisor; now() resolves via the always-present pg_catalog).
create function public.set_<table>_updated_at()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger <table>_set_updated_at
  before update on public.<table>
  for each row execute function public.set_<table>_updated_at();
```

For a **per-tenant** model, swap the predicate for a membership check (a sub-select that
constrains to the caller's tenant and cannot be widened by a forged id), keep everything else.

## 3. RLS self-check — do not skip (ADR 0012/0013/0014/0016)
Before applying, walk every user-reachable table you touched against this list. A miss here
is a row reaching the wrong user — the highest-severity bug this project can ship.

- [ ] **`enable row level security`** on every new table in `public` (policies are inert without it).
- [ ] A policy for **each** needed command — `select` / `insert` / `update` / `delete` (a missing one is a denial or a hole; confirm which).
- [ ] **`update`** policy has **both** `using` and `with check` (else a user can reassign ownership).
- [ ] **`insert`** `with check` pins ownership (`(select auth.uid()) = user_id`).
- [ ] No predicate is **`true`** or omitted on a user-owned table — every one is caller-scoped.
- [ ] **`to authenticated`** on each policy (else it also grants `anon`).
- [ ] **`grant <cmds> … to authenticated`** present; no over-broad grant to `anon`.
- [ ] Functions are **`security invoker`** (or a deliberate, justified definer) **and** `set search_path = ''`.
- [ ] Owner FK to `auth.users (id)` with a sane `on delete`; index on the RLS column.

## 4. Apply locally — rebuild from migrations
```bash
npm run db:reset      # drops + replays ALL migrations from supabase/ (needs the stack up)
```
A failure here is a SQL error in your migration — fix it at the source and re-run. `db:reset`
replaying cleanly is the proof the migration is self-contained and ordered correctly.

## 5. Regenerate the typed client (ADR 0015)
```bash
npm run gen:types     # → src/lib/supabase/database.types.ts (then prettier)
```
Stage the regenerated types **with** the migration — they are one change. (The
`post-edit-checks` hook also nudges this on any migration edit; CI's type-drift replay is
deferred during bootstrap, so regenerating here is the real guarantee.)

## 6. Prove the isolation (ADR 0007 — auth/RLS is risk-weighted, e2e first)
A new user-owned table is the critical path. Add or extend an **e2e** spec under `e2e/` that
asserts a user reads/writes **only** their own rows and is denied another user's (the e2e
job is removed from CI during bootstrap but the specs run locally — `npm run test:e2e`).
For pure data-shape logic a colocated unit test may suffice, but isolation itself wants e2e.

## 7. The human gates that remain (👤 — do not perform)
- **Merging** the migration into `dev` / `main` and any **production** apply is human-only
  (ADR 0046) — production schema changes are promoted by a person.
- A change that needs **Storage / Realtime / Edge Functions**, or any decision **no ADR
  covers**, is **record-the-ADR-first** (step 0) — escalate, don't scaffold.

End by reporting: the migration file created, the RLS self-check result, `db:reset` +
`gen:types` outcomes, the test added, and any 👤 escalation the user must take next.
Consider running the **supabase-rls-reviewer** agent over the diff as an independent check.
