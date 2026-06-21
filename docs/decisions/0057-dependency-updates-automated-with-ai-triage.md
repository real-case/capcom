---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Dependency updates: automated update PRs with AI triage, human-merged

## Context and Problem Statement

The stack pins its platforms deliberately — Node 24 LTS (**0004**), npm with a committed
lockfile (**0005**), version-pinned MCP servers (**0044**) — but no record decides how
any of it *moves*: there is no update cadence, no vulnerability-response path, and no
policy for judging whether an upgrade is safe. Unmanaged, dependencies drift into a
periodic "big bang" upgrade with compounding breakage; meanwhile security advisories
against pinned versions age silently. The stack is also unusually *coupled to its
decisions*: a Next.js major can change App Router semantics (**0002**), a Tailwind major
the CSS-first config (**0032**/**0033**), a Storybook major the whole **0035–0042**
chain — so upgrade triage here is partly *corpus impact analysis*, which generic bots do
not provide.

## Decision Drivers

* **Vulnerabilities must surface promptly** — security updates need a path measured in
  days, not in distance to the next manual sweep.
* **Small steps over big bangs** — continuous small updates keep each diff reviewable
  and bisectable; deferred upgrades compound.
* **Corpus-aware judgment** — the meaningful question for a major bump is "which recorded
  decisions does this touch?"; that analysis needs a reader of both changelogs and ADRs.
* **The human gate stands** — merges remain human per **0047**; the CI gate (**0010**)
  validates but does not yet cover enough behavior to justify auto-merge at bootstrap.
* **Bot config is a trust surface** — automated-update configuration executes with repo
  access and must be bounded like the MCP config (**0044**).

## Considered Options

* Automated update PRs (Renovate-class bot) with an AI triage comment per PR —
  changelog digest, breaking-risk classification, corpus-impact note — human-merged
* Manual periodic upgrade sweeps
* Automated update PRs with auto-merge for minor/patch versions that pass CI

## Decision Outcome

Chosen option: "automated update PRs with AI triage, human-merged", because it pairs the
cadence only automation sustains with the judgment only a corpus-aware reviewer provides,
while keeping the single human gate (**0047**) intact. A Renovate-class bot opens
grouped, scheduled update PRs from a committed, reviewed configuration; security
advisories bypass the schedule. Each update PR receives an AI triage comment: a digest of
the upstream changelog between the pinned and proposed versions, a breaking-risk
classification, and — the corpus-specific part — an impact note naming any recorded
decisions the change touches (e.g. "Tailwind 5: config model changes affect **0032**/
**0033**; if adopted, those records need superseding review"). Humans merge; the CI gate
(**0010**), including story/visual layers (**0037**, **0043**), validates each bump.
MCP server versions (**0044**) are included in the update surface. Auto-merge is
explicitly deferred, not rejected: once gate coverage has a track record, a superseding
record may enable it for patch-level updates.

### Consequences

* Good, because security updates arrive as ready-to-review PRs within days, with the
  blast radius of each change kept small and bisectable.
* Good, because upgrade decisions arrive pre-digested — changelog reading, the costliest
  part of conscientious updating, is amortized to a review of the digest.
* Good, because corpus-impact notes connect the dependency stream to the decision
  process: a major bump that invalidates a record triggers supersession (**0001**)
  instead of silent drift (**0054**'s concern, fed at the source).
* Bad, because update PRs are a standing volume of review work even with grouping; tuning
  the bot's cadence and grouping rules is recurring configuration maintenance.
* Bad, because the bot configuration and its credentials are an additional committed
  trust surface, mitigated the **0044** way: pinned, least-privilege, reviewed.
* Bad, because triage comments cost tokens per PR and can misjudge risk; the human merge
  and the CI gate are the backstops, and the digest must cite sources (changelog links)
  so reviewers can verify rather than trust.

### Confirmation

The bot configuration is committed, reviewed, and pins its own action/app versions;
update PRs are grouped and carry AI triage comments with changelog citations and
corpus-impact notes where applicable; security-advisory PRs demonstrably bypass the
schedule; merges are human (**0047**); no auto-merge rule exists; MCP server versions
appear in the update surface (**0044**).

## Pros and Cons of the Options

### Automated PRs + AI triage, human-merged (chosen)

* Good, because cadence, security response, and reviewability all improve at once.
* Good, because the triage layer converts generic bot PRs into decisions-in-context — the
  corpus-impact note is the part no off-the-shelf tool provides.
* Neutral, because review volume is real but bounded by grouping and scheduling.
* Bad, because it stacks a bot trust surface and an AI cost on top of plain updating.

### Manual periodic sweeps

* Good, because zero standing machinery and full human control of timing.
* Bad, because cadence decays under delivery pressure — the well-documented path to
  big-bang upgrades and silently aging advisories.
* Bad, because each sweep bundles many changes, defeating bisection and inflating the
  review burden it sought to avoid.

### Automated PRs with auto-merge for minor/patch

* Good, because routine updates cost zero human attention.
* Bad, because it waives the single human gate (**0047**) on the exact vector — upstream
  code entering the build — that supply-chain attacks use; semver fidelity is a
  convention, not a guarantee.
* Bad, because at bootstrap the gate's behavioral coverage has no track record to justify
  trusting it alone. Deferred: a superseding record may enable patch-level auto-merge on
  evidence.

## More Information

Supplies the missing motion policy for the pins in **0004**, **0005**, and **0044**.
Builds on **0010**/**0037**/**0043** (the validation each bump runs through), **0047**
(the merge gate), **0001**/**0054** (supersession as the response to
decision-invalidating upgrades). Adjacent: **0056** covers the diff-time security of
first-party code; this record covers the third-party stream; **0053**'s platform-watch
trigger is naturally serviced by this record's changelog digests. Revisit auto-merge
posture once gate coverage matures.
