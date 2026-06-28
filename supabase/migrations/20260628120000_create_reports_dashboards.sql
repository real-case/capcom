-- PR-8 / ADR 0090: saved analyses — the FIRST member-writable domain tables.
-- reports (a saved chart config), dashboards (a named board), and dashboard_reports
-- (the ordered composition). Isolation stays a DATABASE invariant (ADR 0013): every
-- row carries project_id and reaches a member only through the membership join PR-2
-- centralized in is_member(project_id) / has_role(project_id, role). RLS lives in this
-- migration so the security model is versioned with the schema (ADR 0014).
--
-- The write posture is the inverse of events/profiles (PR-3): there members hold only
-- SELECT and every write arrives through the service-role ingest path. Here members
-- WRITE directly — gated entirely by RBAC composing over the isolation (ADR 0090):
--   • SELECT            → any member of the project (is_member).
--   • INSERT/UPDATE/DELETE → has_role(project_id, 'analyst') — so viewer is read-only.
-- owner_id is stamped from auth.uid() (default + WITH CHECK on insert) so the client
-- can assert neither tenancy nor identity (ADR 0083). There is NO service-role write
-- path on these tables — no service_role GRANT.

-- ---------------------------------------------------------------------------
-- report_kind — the four flagship surfaces a saved report can be (ADR 0090). A
-- report's `config` is the originating widget's URL-state (ADR 0027), validated by
-- that widget's Zod schema (ADR 0017) in the app and stored opaque here, exactly as
-- events.properties / profiles.traits are. The enum makes the kind a typed, indexable
-- discriminator and the gen:types surface (ADR 0015) a closed union.
-- ---------------------------------------------------------------------------
create type public.report_kind as enum ('trends', 'funnel', 'retention', 'segment');

-- ---------------------------------------------------------------------------
-- reports — one saved analysis: a named, kind-discriminated config under a project.
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- The member who created the report. Defaulted to and pinned to auth.uid() on insert
  -- (RLS WITH CHECK below) so it cannot be spoofed; never trusted from the payload
  -- (ADR 0090/0083). on delete set null: a removed member's reports survive, attributed
  -- to no one, rather than vanishing — provenance, not ownership-gating (edits are
  -- role-based, ADR 0090).
  owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  name text not null check (char_length(name) between 1 and 120),
  kind public.report_kind not null,
  -- The saved configuration: the widget's URL-state (ADR 0027). Constrained to a JSON
  -- object so a direct write can't store an array/scalar; the per-kind grammar is an
  -- app-layer concern validated by the owning widget's Zod schema (ADR 0017/0090),
  -- never by a SQL check.
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite-uniqueness target for the dashboard_reports same-project FK below: lets a
  -- dashboard reference only reports in its own project. id alone is already unique, so
  -- this is a permitted superset unique used purely as the FK target.
  unique (id, project_id)
);

-- Member read path lists a project's reports newest-first; this project-leading index
-- serves it without a sort.
create index reports_project_id_created_at_idx
  on public.reports (project_id, created_at desc);

comment on table public.reports is
  'Saved analysis: a named report_kind config under a project (ADR 0090). Member-writable, gated by has_role(project,''analyst''); config is the widget URL-state, validated in the app (ADR 0017/0027).';

-- ---------------------------------------------------------------------------
-- dashboards — a named board that composes reports (the composition itself lives in
-- dashboard_reports). "A simple layout" (the roadmap): ordering only, no grid geometry.
-- ---------------------------------------------------------------------------
create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite-uniqueness target for the dashboard_reports same-project FK below.
  unique (id, project_id)
);

create index dashboards_project_id_created_at_idx
  on public.dashboards (project_id, created_at desc);

comment on table public.dashboards is
  'Named board composing reports in its project (ADR 0090). Member-writable, gated by has_role(project,''analyst''). Layout is ordering-only (dashboard_reports.position).';

-- ---------------------------------------------------------------------------
-- dashboard_reports — the ordered composition. A report appears on a dashboard at a
-- `position`; the board is its rows ordered by (position, created_at). project_id is
-- carried so the same-project invariant is a STRUCTURAL guarantee, not a trigger: the
-- composite FKs below force a dashboard and each of its reports to share project_id, so
-- a board can never compose another tenant's report. Cascades clean the link rows when
-- either parent (or the project) is deleted.
-- ---------------------------------------------------------------------------
create table public.dashboard_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  dashboard_id uuid not null,
  report_id uuid not null,
  position int not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  -- Same-project composite FKs: the (id, project_id) target uniques above make these
  -- enforce that the dashboard and the report belong to THIS row's project_id.
  foreign key (dashboard_id, project_id)
    references public.dashboards (id, project_id) on delete cascade,
  foreign key (report_id, project_id)
    references public.reports (id, project_id) on delete cascade,
  -- A report appears on a dashboard at most once. Ordering (position) is not unique —
  -- a reorder rewrites positions and transient duplicates must not trip a constraint.
  unique (dashboard_id, report_id)
);

create index dashboard_reports_dashboard_id_position_idx
  on public.dashboard_reports (dashboard_id, position);
create index dashboard_reports_report_id_idx
  on public.dashboard_reports (report_id);

comment on table public.dashboard_reports is
  'Ordered dashboard↔report composition (ADR 0090). Same-project enforced structurally by composite FKs; member-writable, gated by has_role(project,''analyst'').';

-- ---------------------------------------------------------------------------
-- updated_at maintenance. reports and dashboards are mutable (rename, config edit) so
-- they reuse the generic trigger from the tenancy migration (INVOKER + pinned
-- search_path). dashboard_reports is a thin link whose only mutation is `position`;
-- it carries no updated_at and needs no trigger.
-- ---------------------------------------------------------------------------
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

create trigger dashboards_set_updated_at
  before update on public.dashboards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table privileges. SEPARATE from RLS: this GRANT decides whether a role may touch the
-- table at all; RLS then decides which rows. Unlike events/profiles, members get the
-- full write set here — RLS (below) is the real gate. No service_role GRANT: these
-- tables have NO service-role write path (ADR 0090). anon stays ungranted — the product
-- is authenticated-only (ADR 0016).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.reports to authenticated;
grant select, insert, update, delete on public.dashboards to authenticated;
grant select, insert, update, delete on public.dashboard_reports to authenticated;

-- ---------------------------------------------------------------------------
-- Deny-by-default RLS. RLS on + no policy = every row invisible; the policies below
-- grant scoped access back. Every policy is `to authenticated` (excludes anon) and
-- authorizes through the membership join — the client never asserts its own tenancy.
-- Read is any member; write is has_role(project_id, 'analyst') so viewer is read-only.
-- is_member / has_role run as DEFINER (PR-2), so reading here never recurses.
-- ---------------------------------------------------------------------------
alter table public.reports enable row level security;
alter table public.dashboards enable row level security;
alter table public.dashboard_reports enable row level security;

-- reports -------------------------------------------------------------------
create policy "Members read reports in their projects"
  on public.reports for select
  to authenticated
  using (public.is_member(project_id));

-- Insert: analyst+ only, and owner_id must be the caller — the identity stamp cannot be
-- forged (default auth.uid() fills it; this pins it).
create policy "Analysts create reports in their projects"
  on public.reports for insert
  to authenticated
  with check (
    public.has_role(project_id, 'analyst')
    and owner_id = (select auth.uid())
  );

-- Update/Delete: analyst+ may edit ANY report in their project (role-based, not
-- owner-scoped — a recorded ADR 0090 boundary). WITH CHECK re-asserts the role so a
-- report cannot be moved into a project where the caller lacks the role.
create policy "Analysts update reports in their projects"
  on public.reports for update
  to authenticated
  using (public.has_role(project_id, 'analyst'))
  with check (public.has_role(project_id, 'analyst'));

create policy "Analysts delete reports in their projects"
  on public.reports for delete
  to authenticated
  using (public.has_role(project_id, 'analyst'));

-- dashboards ----------------------------------------------------------------
create policy "Members read dashboards in their projects"
  on public.dashboards for select
  to authenticated
  using (public.is_member(project_id));

create policy "Analysts create dashboards in their projects"
  on public.dashboards for insert
  to authenticated
  with check (
    public.has_role(project_id, 'analyst')
    and owner_id = (select auth.uid())
  );

create policy "Analysts update dashboards in their projects"
  on public.dashboards for update
  to authenticated
  using (public.has_role(project_id, 'analyst'))
  with check (public.has_role(project_id, 'analyst'));

create policy "Analysts delete dashboards in their projects"
  on public.dashboards for delete
  to authenticated
  using (public.has_role(project_id, 'analyst'));

-- dashboard_reports ---------------------------------------------------------
-- Scoped by the row's own project_id (the composite FKs guarantee it equals both the
-- dashboard's and the report's project), so the policies are the same one-liners as the
-- parent tables. No owner_id here — a link row inherits its authorization from the
-- project, not a creator.
create policy "Members read dashboard reports in their projects"
  on public.dashboard_reports for select
  to authenticated
  using (public.is_member(project_id));

create policy "Analysts add dashboard reports in their projects"
  on public.dashboard_reports for insert
  to authenticated
  with check (public.has_role(project_id, 'analyst'));

create policy "Analysts reorder dashboard reports in their projects"
  on public.dashboard_reports for update
  to authenticated
  using (public.has_role(project_id, 'analyst'))
  with check (public.has_role(project_id, 'analyst'));

create policy "Analysts remove dashboard reports in their projects"
  on public.dashboard_reports for delete
  to authenticated
  using (public.has_role(project_id, 'analyst'));
