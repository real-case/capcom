---
name: local-rls-probing
description: How to impersonate seeded users against the local CAPCOM stack to dynamically prove RLS without corrupting the seed
metadata:
  type: feedback
---

When dynamically confirming RLS on the local stack (`docker exec -i supabase_db_capcom psql -U postgres -d postgres`), impersonate a seeded user **inside an explicit transaction** and `rollback`:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<user-uuid>","role":"authenticated"}';
-- ... probes ...
rollback;
```

**Why:** `SET LOCAL` only works in a transaction block — outside one it silently no-ops (warning, not error), `auth.uid()` stays NULL, and statements run as the bare `postgres` superuser which **bypasses RLS entirely**. In this session that made every probe a false result AND let a stray `UPDATE` corrupt Bob's seeded role (had to restore `viewer`) and insert a junk project. The tell that claims didn't apply: a user's *own-tenant* `is_org_member()` returns `false` (auth.uid() is NULL).

**How to apply:** Always wrap impersonation probes in `begin; ... rollback;`. Set `role authenticated` so RLS is enforced (superuser bypasses it). Never run a bare write outside a transaction against this DB — `db:reset` is the only sanctioned way to restore the seed, and you are read-only. Seeded fixtures: alice `aaaa1111-…` (owner Aurora `0a00…01` + admin Globex `0b00…02`), bob `bbbb2222-…` (viewer Aurora), carol `cccc3333-…` (owner Globex). The e2e `RBAC test project` row sometimes survives in Globex as residue — pre-existing, not yours; flag it, don't delete it.
