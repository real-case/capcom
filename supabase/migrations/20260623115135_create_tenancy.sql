-- PR-2 / ADR 0083: the multitenant spine — organization → project, membership + RBAC.
-- Isolation is a DATABASE invariant (ADR 0013): every domain row reaches its reader only
-- through a membership join, enforced by deny-by-default RLS, never by application code.
-- RLS lives in this migration so the security model is versioned with the schema (ADR 0014).
-- The auth-user (a member who logs in) is deliberately NOT the tracked end-user/profile
-- (PR-3); this migration only knows members (ADR 0083).

-- ---------------------------------------------------------------------------
-- Roles. RBAC composes OVER isolation (ADR 0083): a role gates what a member may
-- do inside a tenant they already belong to; it is a second predicate, not the
-- isolation mechanism. Privilege order is made explicit by role_rank() below so it
-- never depends on this enum's declaration order.
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('owner', 'admin', 'analyst', 'viewer');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- The tenant. A row here is one customer organization.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'Tenant root (ADR 0083). Readable by its members; isolation enforced by RLS, not the client.';

-- The analytics workspace. Every domain entity (events, profiles, segments, …) will
-- belong to a project; a project belongs to exactly one organization.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is
  'Analytics workspace under an organization (ADR 0083). Scope every later domain table inherits.';

-- Membership: the link between an auth user and an organization, carrying their role.
-- user_id is NOT defaulted to auth.uid() — a membership is created by an admin FOR
-- another user (or by seed), so the actor and the subject differ.
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One role per (user, organization): a user is a member of an org exactly once.
  unique (user_id, organization_id)
);

comment on table public.memberships is
  'Membership + role (ADR 0083). The authority for tenant isolation: every RLS policy joins through this table.';

-- Lookup paths used by the RLS helpers below. The unique(user_id, organization_id)
-- already indexes (user_id, …); add the org-leading index for the membership-by-org join.
create index memberships_organization_id_idx on public.memberships (organization_id);
create index projects_organization_id_idx on public.projects (organization_id);

-- ---------------------------------------------------------------------------
-- RBAC privilege ladder. Explicit so role_rank('owner') > role_rank('admin') > …
-- regardless of the enum's textual order. IMMUTABLE + pinned search_path.
-- ---------------------------------------------------------------------------
create function public.role_rank(p_role public.app_role)
  returns int
  language sql
  immutable
  set search_path = ''
as $$
  select case p_role
    when 'owner'   then 40
    when 'admin'   then 30
    when 'analyst' then 20
    when 'viewer'  then 10
  end;
$$;

-- ---------------------------------------------------------------------------
-- Membership-join helpers (ADR 0083). These are the ONE place the
-- project → organization → membership join lives, so every policy stays a
-- readable one-liner.
--
-- SECURITY DEFINER is deliberate and required, not a shortcut: is_org_member is
-- referenced by the memberships SELECT policy, and a SECURITY INVOKER helper that
-- reads public.memberships from inside that policy raises Postgres's "infinite
-- recursion detected in policy" error. DEFINER evaluates the membership lookup
-- outside RLS (the standard Supabase idiom for policy helpers), so policies never
-- recurse. The functions take no caller-supplied identity — they read auth.uid()
-- themselves — so a forged argument cannot widen scope; each returns only a boolean
-- about the CALLER's own access. search_path is pinned to '' (mandatory, ADR 0083)
-- so every reference is schema-qualified and immune to search_path hijacking.
-- ---------------------------------------------------------------------------

-- Org-scoped: is the caller a member of this organization?
create function public.is_org_member(p_organization_id uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
  );
$$;

-- Org-scoped: does the caller's role in this organization meet or exceed p_min_role?
create function public.has_org_role(p_organization_id uuid, p_min_role public.app_role)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and public.role_rank(m.role) >= public.role_rank(p_min_role)
  );
$$;

-- Project-scoped (the ADR 0083 public API every domain table uses): caller is a
-- member of the organization that owns this project.
create function public.is_member(p_project_id uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select public.is_org_member(
    (select p.organization_id from public.projects p where p.id = p_project_id)
  );
$$;

-- Project-scoped: caller's role in the owning organization meets or exceeds p_min_role.
create function public.has_role(p_project_id uuid, p_min_role public.app_role)
  returns boolean
  language sql
  security definer
  stable
  set search_path = ''
as $$
  select public.has_org_role(
    (select p.organization_id from public.projects p where p.id = p_project_id),
    p_min_role
  );
$$;

-- Least-privilege execution: these helpers reveal only the caller's own membership,
-- but restrict direct execution to signed-in users regardless. Inter-function calls
-- run as the owner (DEFINER) and are unaffected.
revoke execute on function
  public.is_org_member(uuid),
  public.has_org_role(uuid, public.app_role),
  public.is_member(uuid),
  public.has_role(uuid, public.app_role)
from public;
grant execute on function
  public.is_org_member(uuid),
  public.has_org_role(uuid, public.app_role),
  public.is_member(uuid),
  public.has_role(uuid, public.app_role)
to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at maintenance. One generic trigger function (INVOKER + pinned
-- search_path; now() resolves via the always-present pg_catalog).
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
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

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- A membership's identity is the (user_id, organization_id) pair; only `role` is
-- mutable. Reassigning the pair would silently rewrite who-belongs-where, so it is
-- forbidden even for an admin whose RLS UPDATE policy would otherwise permit the
-- row — a membership is changed by delete + insert, not by moving it (ADR 0083).
-- RLS WITH CHECK only sees the new row, so this old-vs-new guard lives in a trigger.
create function public.enforce_membership_identity_immutable()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  if new.user_id <> old.user_id
     or new.organization_id <> old.organization_id then
    raise exception
      'membership identity (user_id, organization_id) is immutable; change role only';
  end if;
  return new;
end;
$$;

create trigger memberships_identity_immutable
  before update on public.memberships
  for each row execute function public.enforce_membership_identity_immutable();

-- ---------------------------------------------------------------------------
-- Table privileges. SEPARATE from RLS: this GRANT decides whether the role may
-- touch the table at all; RLS then decides which rows. anon stays ungranted — the
-- whole product is authenticated-only (ADR 0016).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;

-- ---------------------------------------------------------------------------
-- Deny-by-default RLS. RLS on + no policy = every row invisible; the policies below
-- grant scoped access back. Every policy is `to authenticated` (excludes anon) and
-- authorizes through the membership join — the client never asserts its own tenancy.
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.projects enable row level security;
alter table public.memberships enable row level security;

-- organizations -------------------------------------------------------------
-- Read: any member of the org. Write: rename is admin+, deletion is owner-only.
-- No INSERT policy by design: provisioning a NEW tenant is a privileged, seeded/
-- admin action in this demo, not self-serve (a conscious PR-2 scope boundary,
-- ADR 0083 "the client never asserts tenancy") — deny-by-default covers it.
create policy "Members read their organizations"
  on public.organizations for select
  to authenticated
  using (public.is_org_member(id));

create policy "Admins update their organization"
  on public.organizations for update
  to authenticated
  using (public.has_org_role(id, 'admin'))
  with check (public.has_org_role(id, 'admin'));

create policy "Owners delete their organization"
  on public.organizations for delete
  to authenticated
  using (public.has_org_role(id, 'owner'));

-- projects ------------------------------------------------------------------
-- Read: any member of the owning org. Create/update: admin+. Delete: owner.
create policy "Members read projects in their organizations"
  on public.projects for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "Admins create projects in their organization"
  on public.projects for insert
  to authenticated
  with check (public.has_org_role(organization_id, 'admin'));

create policy "Admins update projects in their organization"
  on public.projects for update
  to authenticated
  using (public.has_org_role(organization_id, 'admin'))
  with check (public.has_org_role(organization_id, 'admin'));

create policy "Owners delete projects in their organization"
  on public.projects for delete
  to authenticated
  using (public.has_org_role(organization_id, 'owner'));

-- memberships ---------------------------------------------------------------
-- Read: members see the roster of orgs they belong to (so the app can show "your
-- role" and a team list). Manage (add / change role / remove): admin+. is_org_member
-- and has_org_role run as DEFINER, so reading memberships here does not recurse.
create policy "Members read the roster of their organizations"
  on public.memberships for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "Admins add members to their organization"
  on public.memberships for insert
  to authenticated
  with check (public.has_org_role(organization_id, 'admin'));

create policy "Admins change roles in their organization"
  on public.memberships for update
  to authenticated
  using (public.has_org_role(organization_id, 'admin'))
  with check (public.has_org_role(organization_id, 'admin'));

create policy "Admins remove members from their organization"
  on public.memberships for delete
  to authenticated
  using (public.has_org_role(organization_id, 'admin'));
