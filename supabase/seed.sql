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

-- ── Analytics domain (PR-3) ───────────────────────────────────────────────────
-- Per-project ingest keys (ADR 0085). Stored hashed — only sha-256(token) hex is
-- persisted; the plaintext below is a demo credential, documented here so the seed
-- generator (scripts/seed-events.mjs) and the ingest route test can authenticate.
-- A real key is provisioned once, shown once, and never written in plaintext.
--   Aurora Web      → cap_ingest_aurora_web_dev
--   Aurora Mobile   → cap_ingest_aurora_mobile_dev
--   Globex Marketing→ cap_ingest_globex_marketing_dev
-- digest() is pgcrypto (extensions schema), the same module the password hashing
-- above uses, so the hash matches Node's crypto.createHash('sha256') in the route.
insert into public.project_ingest_keys (project_id, key_hash, label)
values
  (
    '0a000000-0000-0000-0000-0000000000a1',
    encode(extensions.digest('cap_ingest_aurora_web_dev', 'sha256'), 'hex'),
    'Aurora Web — demo ingest key'
  ),
  (
    '0a000000-0000-0000-0000-0000000000a2',
    encode(extensions.digest('cap_ingest_aurora_mobile_dev', 'sha256'), 'hex'),
    'Aurora Mobile — demo ingest key'
  ),
  (
    '0b000000-0000-0000-0000-0000000000b1',
    encode(extensions.digest('cap_ingest_globex_marketing_dev', 'sha256'), 'hex'),
    'Globex Marketing — demo ingest key'
  );

-- A small, deterministic slice of tracked users + events so the cross-tenant RLS
-- test (e2e/rls-events.spec.ts) has known data to prove isolation against without
-- depending on the bulk generator. The generator adds dense volume on top; the
-- isolation assertions are tenant-scoped (cross-tenant reads return zero rows),
-- so they hold whether or not the generator has run.
insert into public.profiles (project_id, distinct_id, traits)
values
  ('0a000000-0000-0000-0000-0000000000a1', 'seed-aurora-web-1', '{"plan":"pro"}'),
  ('0a000000-0000-0000-0000-0000000000a1', 'seed-aurora-web-2', '{"plan":"free"}'),
  ('0b000000-0000-0000-0000-0000000000b1', 'seed-globex-1', '{"plan":"enterprise"}');

insert into public.events (project_id, event_name, distinct_id, properties, ts)
values
  ('0a000000-0000-0000-0000-0000000000a1', 'page_view', 'seed-aurora-web-1', '{"path":"/"}', now() - interval '2 days'),
  ('0a000000-0000-0000-0000-0000000000a1', 'sign_up', 'seed-aurora-web-1', '{}', now() - interval '2 days'),
  ('0a000000-0000-0000-0000-0000000000a1', 'page_view', 'seed-aurora-web-2', '{"path":"/pricing"}', now() - interval '1 day'),
  ('0b000000-0000-0000-0000-0000000000b1', 'page_view', 'seed-globex-1', '{"path":"/"}', now() - interval '1 day'),
  ('0b000000-0000-0000-0000-0000000000b1', 'purchase', 'seed-globex-1', '{"amount":99}', now() - interval '3 hours');

-- ── Saved analyses (PR-8 / ADR 0090) ──────────────────────────────────────────
-- A fourth member, dave, is an ANALYST of Aurora Labs. He brackets the write-RBAC
-- boundary precisely against bob (viewer of the same org): dave may create/edit/delete
-- reports & dashboards, bob may only read them (e2e/dashboards.spec.ts). alice (owner)
-- and carol (owner of Globex) keep proving "above the threshold" and "isolation".
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'dddd4444-4444-4444-4444-444444444444',
    'authenticated', 'authenticated', 'dave@capcom.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}'
  );

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
where id = 'dddd4444-4444-4444-4444-444444444444';

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  created_at, updated_at, last_sign_in_at
)
values
  (
    gen_random_uuid(),
    'dddd4444-4444-4444-4444-444444444444',
    'dddd4444-4444-4444-4444-444444444444', 'email',
    '{"sub":"dddd4444-4444-4444-4444-444444444444","email":"dave@capcom.dev","email_verified":true}',
    now(), now(), now()
  );

insert into public.memberships (user_id, organization_id, role)
values
  ('dddd4444-4444-4444-4444-444444444444', '0a000000-0000-0000-0000-000000000001', 'analyst');

-- A few saved reports in Aurora Web (a1), owned by alice. config is each widget's
-- URL-state (ADR 0027) — the same shapes the widgets' Zod schemas validate (ADR 0017);
-- stored opaque here. Fixed ids so the dashboard composition and e2e are deterministic.
insert into public.reports (id, project_id, owner_id, name, kind, config)
values
  (
    'd0000000-0000-0000-0000-000000000001',
    '0a000000-0000-0000-0000-0000000000a1',
    'aaaa1111-1111-1111-1111-111111111111',
    'Daily page views',
    'trends',
    '{"event":"page_view","range":"30d","interval":"day","breakdown":"none"}'::jsonb
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    '0a000000-0000-0000-0000-0000000000a1',
    'aaaa1111-1111-1111-1111-111111111111',
    'Acquisition funnel',
    'funnel',
    '{"steps":["page_view","sign_up","feature_used","purchase"],"range":"90d","window":"30d"}'::jsonb
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    '0a000000-0000-0000-0000-0000000000a1',
    'aaaa1111-1111-1111-1111-111111111111',
    'Paying purchasers by country',
    'segment',
    '{"rule":{"match":"all","attributes":[{"key":"plan","op":"eq","value":"pro"}],"behaviors":[{"event":"purchase","op":"at_least","count":1}]},"dimension":"country","range":"90d"}'::jsonb
  );

-- One dashboard composing the trends + funnel reports (positions 0, 1). The segment
-- report stays uncomposed so the e2e can prove add/remove against a known baseline.
insert into public.dashboards (id, project_id, owner_id, name)
values
  (
    'da000000-0000-0000-0000-000000000001',
    '0a000000-0000-0000-0000-0000000000a1',
    'aaaa1111-1111-1111-1111-111111111111',
    'Acquisition overview'
  );

insert into public.dashboard_reports (project_id, dashboard_id, report_id, position)
values
  ('0a000000-0000-0000-0000-0000000000a1', 'da000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 0),
  ('0a000000-0000-0000-0000-0000000000a1', 'da000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 1);
