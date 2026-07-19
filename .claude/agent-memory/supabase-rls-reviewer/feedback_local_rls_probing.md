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

**How to apply:** Always wrap impersonation probes in `begin; ... rollback;`. Set `role authenticated` so RLS is enforced (superuser bypasses it). Never run a bare write outside a transaction against this DB — `db:reset` is the only sanctioned way to restore the seed, and you are read-only. The e2e `RBAC test project` row sometimes survives in Globex as residue — pre-existing, not yours; flag it, don't delete it.

**Seeded fixtures** (verified 2026-07-16 — memberships are org-level, projects inherit):

| user | uuid prefix | org membership |
| --- | --- | --- |
| alice | `aaaa1111-…` | owner Aurora Labs + admin Globex Analytics |
| bob | `bbbb2222-…` | viewer Aurora Labs |
| carol | `cccc3333-…` | owner Globex Analytics |
| dave | `dddd4444-…` | analyst Aurora Labs |

Projects: Aurora Web `0a000000-0000-0000-0000-0000000000a1`, Aurora Mobile `…00a2` (org Aurora Labs); Globex Marketing `0b000000-0000-0000-0000-0000000000b1` (org Globex Analytics). **No non-member fixture exists** — for a cross-tenant probe use bob→Globex or carol→Aurora, which are foreign to each other. Since every fixture is a member *somewhere*, a probe that forgets `set local role authenticated` can still look plausible; the sanity tell (own-tenant `is_member()` true AND foreign-tenant false, `auth.uid()` non-null) is what proves claims applied.
