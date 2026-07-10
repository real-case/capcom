-- Add the `events` report kind (ADR 0098, extending ADR 0090).
--
-- A saved events-explorer view persists as a report of kind `events` — the 0090 report
-- model is the single saved-analysis shape ("never a new ad-hoc table", ADR 0097). The
-- enum value is the ENTIRE database delta: no table, policy, or GRANT changes — the
-- reports RLS/RBAC (analyst-writable, member-readable, ADR 0090) applies to the new
-- kind untouched. The config payload remains the owning widget's URL-state (ADR 0027),
-- validated in the app (ADR 0017); the jsonb_typeof CHECK already covers it.
--
-- Note: ADD VALUE is irreversible in place (Postgres enums cannot drop a value);
-- retiring the kind later would need a mapping migration (recorded in ADR 0098).
alter type public.report_kind add value if not exists 'events';

comment on type public.report_kind is
  'The surfaces a saved report can be (ADR 0090): the four flagship analyses plus the raw-event explorer view (events, ADR 0098). A report''s config is the owning widget''s URL-state.';
