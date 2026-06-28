---
status: "accepted"
date: 2026-06-28
decision-makers: Yurii Anichkin
---

# AI natural-language query: closed query-spec contract and untrusted-output interpretation

## Context and Problem Statement

PR-9 adds the demo's AI surface: a free-text prompt ("registrations by channel over 30 days")
becomes a real analysis. The four analysis verticals already exist as read-only `SECURITY INVOKER`
aggregation RPCs run under the caller's RLS — trends (**0084**), funnels (**0087**), retention
(**0088**), segments (**0089**) — and each is parameterized *entirely* by a Zod-validated URL-state
(**0027/0017**). PR-8 (**0090**) already built `entities/report`: the `kind`-discriminated config
contract (`report_kind = trends | funnel | retention | segment`), the `reportKindRoute` kind→surface
map, and `reportConfigToSearchParams` — the serializer that turns a saved config back into the
surface's URL-state. The advisory-AI transport (**0075**) is a provider-neutral, OpenAI-compatible
`fetch` client that is **inert without `AI_API_KEY`**.

What no accepted record fixes is the **contract by which a language model's output becomes one of
those four analyses** — and that contract is squarely a security decision, because the model is an
**untrusted input source** whose output selects and parameterizes a database query:

1. **Does the model emit SQL / a query, or a closed spec?** A model that writes SQL (or a raw
   RPC/PostgREST call) is precisely the injection surface **0089** closes for user-authored segment
   rules; a model that emits a closed, validated spec is not.
2. **What is the spec's grammar, and where does it live under FSD?** The four config grammars live
   in the `widgets` layer (their URL-state schemas) and in `entities/segment` (the rule). A
   translation feature cannot import *upward* into `widgets` (**0065/0066**) — the same tension PR-4–7
   hit. What shape does the model target, and from which layer is it validated?
3. **How is untrusted model output safely interpreted?** Where is the injection boundary, and what
   happens to output that falls outside the closed grammar?
4. **What runs without a key?** **0075** mandates the surface sleep gracefully (never crash) without
   `AI_API_KEY`; a deployed portfolio demo without a provisioned key should still demonstrate the
   flow rather than show a dead feature.
5. **Where does an interpreted result go** — a new chart renderer in the AI slice, or the existing
   four surfaces?

This record fixes the **NL → query-spec contract, the untrusted-output interpretation boundary, and
the no-key fallback** before the `features/ai-query` slice, the `src/lib/ai` runtime client, the
translation Server Action, and the AI page are built — so the spec has a closed Zod grammar, the
model output has one validation authority, and the tests have a deterministic contract to prove. It
does **not** re-decide the transport (**0075**), the aggregation (**0084** RPCs), the URL-state a
result is opened into (**0027**), or the report `{ kind, config }` shape it reuses (**0090**).

## Decision Drivers

* **The model is untrusted — its output must cross a closed Zod boundary, never reach SQL or a URL
  unvalidated.** This is the **0089** injection-boundary posture ("the closed grammar is the
  injection boundary; never built into SQL with dynamic-SQL/`EXECUTE`"), now applied to model output.
* **No new query surface, no aggregation in application code (0084).** Reuse the four existing
  `SECURITY INVOKER` RPCs and **0090**'s deep-link, not a fifth renderer — which also keeps the
  feature from importing the `widgets` layer it sits below (**0065/0066**).
* **Reuse the spec shape the codebase already has.** A report is `{ kind, config }` (**0090**); an
  AI result should be the *same* validated shape, so it opens on an existing surface by hydrating
  URL-state (**0027**) and a future "save this as a report" is additive, not a second format.
* **Sleep gracefully without a key (0075).** The surface must never crash without `AI_API_KEY`, and
  the deployed demo should still show NL→spec→surface end-to-end; provisioning a key must upgrade the
  same flow to live model translation with no code change.
* **Server-only secret (0018/0075).** The AI call, the key, the provider, and the prompt run
  server-side only and never reach the browser bundle (the `server-only` fence).
* **Provider-neutral (0075).** No vendor is hardwired; the app's runtime client mirrors
  `scripts/ai/lib.mjs`'s OpenAI-compatible posture as a TypeScript sibling, configured by the three
  `AI_*` env vars.

## Considered Options

* **A — A closed discriminated-union query-spec** the model emits as JSON, validated by one
  `[ai-query]` Zod schema (reusing the existing per-kind grammars), **interpreted by deep-linking**
  through **0090**'s serializer to the existing surface; a **deterministic offline interpreter**
  produces the same spec when no key is present. *(chosen)*
* **B — The model emits SQL** (or a raw RPC / PostgREST call) executed against the database.
* **C — The model emits free-form structured JSON** the app maps imperatively (no single Zod
  authority), rendered by a **new chart renderer inside the AI slice**.
* **D — Tool / function-calling**: expose the four RPCs as model "tools" the model invokes with
  arguments.

## Decision Outcome

Chosen option: **A — the model returns a closed, Zod-validated `{ kind, config }` spec (a report
minus its name), interpreted by deep-linking to the existing surface via 0090's serializer, with a
deterministic offline interpreter as the no-key fallback** — because it makes untrusted model output
cross exactly one closed grammar (so it can at worst pick a *valid* analysis, never inject — the
**0089** guarantee), reuses the four `SECURITY INVOKER` RPCs and **0090**'s deep-link instead of a
fifth renderer (no new SQL, no aggregation in app code — **0084**; no `features → widgets` upward
import — **0065/0066**), stores precisely the report shape the codebase already validates (**0090**),
and keeps the demo alive without a key while staying provider-neutral and server-only (**0075/0018**).
B, C, and D each reopen a boundary the project has already closed — see below.

The contract this record fixes — what `features/ai-query`, `src/lib/ai`, the translation Server
Action, and the AI page implement:

* **The spec is a closed discriminated union on `kind`.** `kind ∈ report_kind` (**0090**'s enum:
  `trends | funnel | retention | segment`); `config` is *exactly* the originating surface's
  URL-state grammar — `{ event, range, interval, breakdown }` for `trends`, `{ steps, range, window }`
  for `funnel`, `{ range, period }` for `retention`, `{ rule, dimension, range }` for `segment`. So
  a spec **is** a `reports` row's `{ kind, config }` minus `name` (**0090**); an AI result and a
  saved report carry the identical validated shape. One `[ai-query]` Zod schema (**0017**) is the
  validation authority *and* the injection boundary: the model's raw text is parsed as JSON and
  `safeParse`d against it, and **rejected, never coerced**, on any mismatch — an unknown `kind`, an
  out-of-vocabulary event/enum, an extra key (`strictObject`), or a malformed `rule` all yield a
  graceful "couldn't interpret that", never a query.
* **Interpretation = deep-link, not a new renderer.** A validated spec is turned into the destination
  surface's URL by **0090**'s `reportKindRoute[kind]` + `reportConfigToSearchParams(kind, config)`
  and surfaced as an **"Open analysis →"** link plus a plain-language summary of the interpreted spec.
  The user navigates to the existing `trends | funnels | retention | segments` page, which hydrates
  its nuqs URL-state (**0027**) and runs the existing aggregation RPC under the caller's RLS
  (**0084**). The AI slice therefore **never calls an RPC, builds a query, or renders a chart**: no
  new SQL, no aggregation in application code (**0084**), no chart code (**0086**), and no
  `features → widgets` upward import (**0065/0066**) — the feature reaches only *downward* into
  `entities/report` (the route map + serializer) and `entities/segment` (the rule grammar), exactly
  the layering **0090** established. The destination widget **re-validates** the config on hydrate
  (its nuqs `parseAsJson(segmentRuleSchema.parse)` and enum parsers), so a config that passed the
  feature schema is checked again at the surface — defense in depth, and the "widget is the reopen
  authority" posture **0090** already fixed.
* **Untrusted-output safety — the injection boundary (applying 0089).** The model never emits SQL, a
  table or column name, an RPC name, or a raw URL — only values *inside* the closed enums and grammar
  of the spec. Anything outside fails `safeParse`; anything inside is the same curated vocabulary the
  widgets already feed to the RPCs (the curated event names, the range/interval/period enums, and the
  closed segment rule whose in-database interpreter is non-dynamic-SQL by **0089**). So the worst a
  model (or a prompt-injected model) can do is select a **valid** analysis the user did not intend —
  a semantic error, never an injection. This is **0089**'s "closed grammar is the injection boundary"
  guarantee, extended from user-authored rules to model output.
* **Server-side only; the key is a server secret (0018/0075).** Translation runs in a `"use server"`
  Server Action (the **0090** action pattern) over a runtime AI client in `src/lib/ai/` — a
  provider-neutral, OpenAI-compatible `fetch` client mirroring `scripts/ai/lib.mjs` (**0075**),
  reading `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` from the `server-only` env module (**0018**). The
  key, the provider endpoint, and the prompt never reach client code; the action returns a
  discriminated `{ ok } | { ok: false, reason }` result and never throws. The template ships
  **provider-neutral** — no vendor is named as a default; `.env.example` documents the three `AI_*`
  vars and the app is inert until they are provisioned (**0046/0044**).
* **No-key (and AI-error) fallback — a deterministic offline interpreter (0075 inertness made
  useful).** Without `AI_API_KEY`, or when a live call errors or returns an uninterpretable result,
  the action falls back to a **bounded, deterministic local interpreter**: a closed keyword/intent
  mapping over the *same* curated vocabulary that produces the *same* `[ai-query]` spec for a
  recognized set of demo intents, surfaced honestly as **"offline demo mode"** (a rule-based
  stand-in, explicitly *not* a model). An unrecognized prompt yields a graceful "try one of these
  examples" with curated example chips (each a pre-computed spec → deep-link). The feature therefore
  **never crashes without a key** (**0075**) and the deployed demo still demonstrates NL→spec→surface;
  provisioning a key upgrades the identical flow to live model translation with no code change. The
  offline interpreter doubles as the deterministic happy-path the tests assert; the live path is
  exercised by a **stubbed** client and stays inert in CI.

Stated scope boundaries (consciously OUT, each additive without reopening this contract):
**conversational / multi-turn refinement** and a clarification turn (one prompt → one spec here);
**multi-analysis or dashboard-composing output** (the model emits one analysis); **breakdowns /
events outside the curated vocabulary** (the spec's enums bound it, mirroring the widgets'
demo-scope curation); **streaming** the completion; **persisting an AI result as a saved report**
(the spec already *is* a report's `{ kind, config }`, so this is a one-call additive follow-up on
**0090**'s write path, not a reopening); and **growing the offline interpreter into a real NLU
engine** (it is a bounded demo-intent mapper by design — the live model is the real translator).

### Consequences

* Good, because untrusted model output crosses exactly **one closed Zod boundary** (**0017**) and can
  at worst select a *valid* analysis — never inject SQL, an RPC, or a table name (**0089**'s boundary,
  extended to the model).
* Good, because there is **no new query or aggregation surface**: a validated spec deep-links
  (**0090**) to the existing four `SECURITY INVOKER` RPCs under the caller's RLS (**0084**) — no new
  SQL, no app-side reduction, no chart code (**0086**).
* Good, because the slice is **FSD-clean**: it imports only *downward* (`entities/report`,
  `entities/segment`, `src/lib/ai`) and never into `widgets` (**0065/0066**) — the deep-link sidesteps
  the exact `feature → widget` tension PR-4–7 hit, with no duplicated renderer.
* Good, because the spec is a report's `{ kind, config }` (**0090**), so an AI result is the *same*
  validated shape a saved report stores and a surface hydrates from URL-state (**0027**); "save this
  AI result as a report" is later additive, not a second format.
* Good, because the surface **sleeps gracefully without a key** (**0075**) yet the demo still works
  offline via the deterministic interpreter; a provisioned key upgrades to live translation with no
  code change, and the secret stays server-only (**0018**).
* Neutral, because the `trends`/`funnel`/`retention` config grammars are **mirrored** in the
  `[ai-query]` schema (the `segment` arm reuses `entities/segment`'s rule, and the kind enum +
  route come from `entities/report`, but the three small URL-state enums are re-declared one layer
  down) — the same mirror-with-comment posture **0090** took for `defaultConfigForKind`; the
  destination widget stays the reopen authority, so any drift degrades to a default fallback, never
  an error.
* Bad, because the offline interpreter is a **bounded keyword mapper, not real NLU** — it recognizes
  a curated intent set and must be labeled honestly as a non-model stand-in; a prompt outside that set
  gets examples, not an answer. Accepted: the live model is the real translator; the interpreter is
  the no-key demo floor and the deterministic test fixture.
* Bad, because a live model can still **mis-map a valid-but-unintended prompt** to the wrong analysis
  (a semantic, not a safety, error) — mitigated by showing the interpreted spec in plain language with
  an explicit "Open analysis →" step, so a wrong interpretation is *visible* before anything runs,
  never silently executed.

### Confirmation

* The `[ai-query]` Zod schema is a discriminated union over the four kinds reusing the per-surface
  grammars; a unit suite proves it (1) accepts a valid spec per kind and round-trips it through
  `reportConfigToSearchParams` to the correct surface URL, and (2) **rejects** model output carrying
  an unknown `kind`, an out-of-vocabulary event/enum, an extra key (`strictObject`), or SQL
  metacharacters in any field — each yielding a graceful error result, never a query (the **0089**
  injection-boundary test shape applied to the spec).
* The deterministic offline interpreter is unit-tested on a fixture set (e.g. "registrations by
  channel over 30 days" → `trends { event: sign_up, breakdown: referrer, range: 30d, interval: day }`,
  plus a funnel, retention, and segment intent) and on an unrecognized prompt (→ graceful no-match) —
  the no-key happy path; the live path is exercised by a **stubbed AI client** returning a canned spec
  JSON (asserting parse → deep-link), with the real network path inert in CI (no `AI_API_KEY`),
  mirroring **0075**'s inert-until-key posture.
* Translation is a `"use server"` action over a request-scoped client and the `src/lib/ai` runtime
  client; `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` live in the `server-only` env module (**0018**),
  and `security-reviewer` confirms no secret or AI call reaches client code, the action returns a
  discriminated result and never throws, and **no SQL, RPC name, table, or URL is ever constructed
  from model text** — only a `safeParse`d spec deep-links via the **0090** serializer.
* The slice passes `check:fsd` + `check:boundaries` (downward-only imports, no `widgets` import),
  `check:design-system` (token-only UI), `check:i18n` (the `AiQuery` namespace), and
  `check:citations`; `check:claude` / `check:claude-md` reconcile this record's citations after
  `adr-sync-claude-md`.

## Pros and Cons of the Options

### A — Closed `{ kind, config }` query-spec, deep-linked via 0090, with a deterministic offline fallback (chosen)

The model emits one of four kinds + that kind's URL-state config as JSON, validated by one
`[ai-query]` Zod schema; a validated spec deep-links to the existing surface; no key → a deterministic
keyword interpreter produces the same spec.

* Good, because untrusted output crosses one closed grammar and can only ever select a *valid*
  analysis — never inject (**0089**).
* Good, because it reuses the four RPCs (**0084**) and **0090**'s deep-link — no new SQL, no
  aggregation in app code, no chart code, no `features → widgets` import (**0065/0066**).
* Good, because the spec is a report's `{ kind, config }` (**0090**), opened by hydrating URL-state
  (**0027**) and validated by the same Zod authority (**0017**).
* Good, because it sleeps gracefully without a key yet keeps the demo alive (**0075**); a key upgrades
  it to live with no code change; the secret stays server-only (**0018**).
* Neutral, because three small config grammars are mirrored one layer down (the **0090**
  `defaultConfigForKind` posture); the widget remains the reopen authority.
* Bad, because the offline interpreter is a bounded mapper, not NLU, and a live model can still
  mis-*select* (a visible semantic error, not a safety one).

### B — The model emits SQL (or a raw RPC / PostgREST call)

* Good, because maximally flexible — the model can express any query.
* Bad, because it **is** the injection surface **0089** closes: untrusted text becoming SQL, with no
  closed grammar and RLS as the only backstop; it bypasses the `SECURITY INVOKER` RPC contract
  (**0084**) and violates the Restrictions' "segment rules are never built into SQL with
  dynamic-SQL/`EXECUTE`" posture generalized to all model output. Rejected outright.

### C — Free-form structured JSON mapped imperatively + a new in-slice chart renderer

* Good, because the model output is JSON, not SQL.
* Bad, because without a single Zod authority the mapping is ad-hoc and drifts (**0017**); rendering
  the result inline needs the chart widgets — a `features → widgets` upward import FSD forbids
  (**0065/0066**) — or duplicated chart code (**0086**); and it reinvents **0090**'s serializer plus
  the four already-built surfaces for no gain.

### D — Tool / function-calling (expose the RPCs as model tools)

* Good, because it is the idiomatic agentic shape — the model "calls" a typed function.
* Bad, because it leans on provider-specific tool-calling semantics, against **0075**'s
  common-OpenAI-subset, provider-neutral posture; the function arguments still need the same closed
  Zod validation as A, so it adds a transport coupling for no safety gain; and it is heavier than a
  single completion returning one spec for a one-shot translation.

## More Information

This record applies and composes accepted decisions rather than reopening them: it uses the **0075**
transport (as a `src/lib/ai` runtime sibling of `scripts/ai/lib.mjs`), reuses **0090**'s report
`{ kind, config }` shape, `reportKindRoute`, and `reportConfigToSearchParams` deep-link serializer,
opens results by hydrating **0027** URL-state validated by the **0017** Zod boundary, extends
**0089**'s closed-grammar injection boundary to model output, keeps aggregation in the **0084** RPCs
with no new datastore (**0012**) and no chart code beyond the **0086** surfaces, confines the secret
behind the **0018** `server-only` fence, and obeys **0065/0066** FSD downward-only layering (the
reason the result deep-links rather than renders inline). It is consumed by the PR-9 `features/ai-query`
slice, the `src/lib/ai` client, the translation Server Action, the `AiQuery` i18n namespace, and the
`/(app)/p/[projectId]/ask` page. Revisit only if the demo needs conversational refinement,
multi-analysis output, live streaming, or a model-driven save-as-report — all additive, none
reopening the closed spec, the deep-link interpretation, or the no-key fallback fixed here.
