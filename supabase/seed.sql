-- CAPCOM demo seed (PR-2). Deterministic tenancy fixtures so the app has content
-- and the RLS isolation tests (e2e/rls-tenancy.spec.ts) run against known users.
-- Applied by `db:reset` on a freshly-rebuilt local database (config.toml db.seed);
-- never used in production. Every account shares the password `password123`.
--
-- The cast of members is chosen to exercise the model (ADR 0083):
--   alice  — owner of Aurora Labs AND admin of Globex Analytics (multi-tenant
--            member; her switcher shows both organizations)
--   bob    — viewer of Aurora Labs only (proves role gating: can read, can't write)
--   carol  — owner of Globex Analytics only (proves isolation: never sees Aurora)

-- ── Auth users ──────────────────────────────────────────────────────────────
-- Users can only be created from SQL by writing GoTrue's own tables. The password
-- is hashed with pgcrypto (extensions schema); the email is pre-confirmed so the
-- account can sign in immediately.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaa1111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'alice@capcom.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbb2222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'bob@capcom.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccc3333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'carol@capcom.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}'
  );

-- GoTrue scans these token columns into non-nullable Go strings on every login;
-- a NULL (the column default) raises "Database error querying schema". Seeding
-- them empty is the documented fix for SQL-created users.
update auth.users
set
  confirmation_token = '',
  recovery_token = '',
  email_change = '',
  email_change_token_new = '',
  email_change_token_current = '',
  phone_change = '',
  phone_change_token = '',
  reauthentication_token = ''
where id in (
  'aaaa1111-1111-1111-1111-111111111111',
  'bbbb2222-2222-2222-2222-222222222222',
  'cccc3333-3333-3333-3333-333333333333'
);

-- One email identity per user (GoTrue requires it for password sign-in). The
-- generated `email` column is derived from identity_data, so it is not inserted.
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  created_at, updated_at, last_sign_in_at
)
values
  (
    gen_random_uuid(),
    'aaaa1111-1111-1111-1111-111111111111',
    'aaaa1111-1111-1111-1111-111111111111', 'email',
    '{"sub":"aaaa1111-1111-1111-1111-111111111111","email":"alice@capcom.dev","email_verified":true}',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'bbbb2222-2222-2222-2222-222222222222',
    'bbbb2222-2222-2222-2222-222222222222', 'email',
    '{"sub":"bbbb2222-2222-2222-2222-222222222222","email":"bob@capcom.dev","email_verified":true}',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'cccc3333-3333-3333-3333-333333333333',
    'cccc3333-3333-3333-3333-333333333333', 'email',
    '{"sub":"cccc3333-3333-3333-3333-333333333333","email":"carol@capcom.dev","email_verified":true}',
    now(), now(), now()
  );

-- ── Tenancy graph ─────────────────────────────────────────────────────────────
insert into public.organizations (id, name)
values
  ('0a000000-0000-0000-0000-000000000001', 'Aurora Labs'),
  ('0b000000-0000-0000-0000-000000000002', 'Globex Analytics');

insert into public.projects (id, organization_id, name)
values
  ('0a000000-0000-0000-0000-0000000000a1', '0a000000-0000-0000-0000-000000000001', 'Aurora Web'),
  ('0a000000-0000-0000-0000-0000000000a2', '0a000000-0000-0000-0000-000000000001', 'Aurora Mobile'),
  ('0b000000-0000-0000-0000-0000000000b1', '0b000000-0000-0000-0000-000000000002', 'Globex Marketing');

insert into public.memberships (user_id, organization_id, role)
values
  ('aaaa1111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000001', 'owner'),
  ('aaaa1111-1111-1111-1111-111111111111', '0b000000-0000-0000-0000-000000000002', 'admin'),
  ('bbbb2222-2222-2222-2222-222222222222', '0a000000-0000-0000-0000-000000000001', 'viewer'),
  ('cccc3333-3333-3333-3333-333333333333', '0b000000-0000-0000-0000-000000000002', 'owner');
