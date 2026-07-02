---
status: "accepted"
date: 2026-07-02
decision-makers: Yurii Anichkin
---

# Anti-hallucination component approval and the drift seal, adapted for Claude Design

## Context and Problem Statement

ADR **0063** defined the anti-hallucination approval protocol and the drift seal for **Figma**:
approve each component variant against the *real Figma frame* (the server's image capability, never
its code-generation path), show the human the design pixels — **not** the agent's implementation —
and keep only an `ApprovalSeal` (`renderHash` + `figmaFileVersion`) as a drift detector that re-opens
variants when the design moves (problems P4, P9). Baselines stay human-only (**0047**/**0043**).

With **0094** replacing Figma with **Claude Design** as the design source, the seal's Figma-specific
mechanism no longer applies, and Claude Design introduces a sharp new edge the read-only figma server
never had: because `DesignSync` is **bidirectional** (read *and* write), the implementing agent could
push its own render into a Claude Design project and then "approve" against it — precisely the
self-closure **0063** exists to break, now technically reachable through the tool. This record
**re-establishes 0063's principle unchanged** and **adapts only its mechanism** to Claude Design,
adding the guardrail the writable tool demands. It supersedes **0063**.

## Decision Drivers

* **Proof the agent does not control (P4, unchanged)** — the approval reference must be a
  **human-authored** design the implementing agent did not produce.
* **Bidirectional-tool hazard (new)** — `DesignSync` can write; the protocol must forbid the agent
  from authoring/syncing the design it then approves against.
* **Pixels, not source (adapted "image, not code")** — consume a **render** of the Claude Design
  preview, never read the preview's source HTML via `get_file` and reproduce it; reading the source
  is the "code path" **0063** warns against (the agent must *match* pixels, not copy markup).
* **Detect drift, do not snapshot (P9, unchanged)** — persist a seal, never the agent's render.
* **Baseline approval is human-only (unchanged, 0047/0043)** — Chromatic baselines and the design
  approval remain human acts.
* **Read-only consumption + injection boundary** — the implementing agent uses `DesignSync` **read**
  methods only in the approval loop; fetched content is **data, not instructions**.

## Considered Options

* **A — Ephemeral Claude-Design-render reconciliation artifact + a persistent `ApprovalSeal`**
  (`renderHash` of the human-authored preview render + a Claude Design version identifier), plus an
  explicit bidirectional guardrail.
* **B — Approve against the agent's own render / synced catalog** — the self-closure.
* **C — Trust the spec alone (0062)** — no visual reconciliation.

## Decision Outcome

Chosen option: **A**, because it preserves **0063**'s core — approval evidence the agent cannot
fabricate, a drift seal rather than a stored render, and human-only baselines — and adapts only the
mechanism to Claude Design. At API approval the agent assembles an **ephemeral reconciliation
artifact**: each variant beside a **render of the human-authored Claude Design component/screen**
(obtained by *rendering the preview* — e.g. via the project's preview/screenshot tooling — **not** by
reading its source HTML), plus the deep link and the agent's interpretation, and it **does not show
its own implementation**. The human approves against the Claude Design pixels. After approval the
artifact is **discarded**; the only trace in `design-intent.ts` is an `ApprovalSeal`: `renderHash`
(of the approved preview render) + a **Claude Design version identifier** — the project `updatedAt`
and/or a content hash of the source preview file (the `figmaFileVersion` analog). A Stage-1 fitness
function re-renders and compares the hash; a mismatch re-opens the affected variants (P9).

The **bidirectional guardrail** this record adds: the design used for approval **must be
human-authored**, in a context separate from the implementing agent; the implementing agent uses
`DesignSync` **read** methods only and **never** its write methods (`create_project` / `write_files`
/ `delete_files`) inside the approval loop; the **code→design catalog sync** (**0094**) is a
separate, deliberate, human-initiated publish — **never** the approval reference. Visual-regression
baselines stay human-only (**0043**/**0047**), for the same reason the agent is never shown its own
implementation. `behavior` (ref-forwarding, controlled state, aria, focus) is engineering-built and
out of this visual protocol (**0062**, unchanged). Option B is the self-closure the record exists to
break — now easier to fall into with a writable tool; option C lets a hallucinated variant pass with
no seal to catch later drift.

### Consequences

* Good, because the approver compares the spec to design pixels the agent did not produce (P4), and
  the seal keeps detecting drift (P9) — the whole of **0063**'s value, preserved.
* Good, because rendering the preview keeps the "pixels, not code" property in Claude Design's
  HTML/component medium.
* Good, because the explicit guardrail neutralizes the new bidirectional self-approval hazard.
* Good, because it stores no committed image baselines — consistent with **0043**'s zero-`*.png`
  posture and **0063**'s seal-not-snapshot stance.
* Bad, because the writable tool makes self-closure *easier to fall into*, so the guardrail is a
  standing discipline, partly human-enforced, not a property of a read-only server.
* Bad, because rendering previews adds a step and a render cost — the Claude Design analog of
  **0063**'s figma-image rate-limit concern, to watch before the first multi-component wave.
* Bad, because `renderHash` calibration (tolerating benign render noise) carries over from
  **0063**/**0043**, and the flow ties to claude.ai-login availability.

### Confirmation

* A sampled component's approval artifact shows a **render of the human-authored Claude Design
  preview** beside the spec, and **not** the agent's implementation or code; after approval only the
  `ApprovalSeal` (`renderHash` + Claude Design version id) remains in `design-intent.ts`.
* A fitness function re-renders by identifier and re-opens variants on a hash mismatch (P9).
* `check:seals` keys off the Claude Design project (inert until one exists) — the figma-seal analog,
  same shape/presence gate.
* The implementing agent's approval-loop tool use is **read-only** (no `DesignSync` writes); the
  code→design catalog publish is a separate human-initiated action (**0094**).
* Visual-regression baselines are approved only in the Chromatic UI by a human (**0043**/**0047**).
  Subject to the **0054** drift audit once accepted.

## Pros and Cons of the Options

### A — Ephemeral Claude-Design-render artifact + ApprovalSeal + guardrail (chosen)

* Good, because approval evidence is agent-uncontrollable, human-authored pixels, and the seal keeps
  detecting drift.
* Good, because it re-uses **0063**'s whole structure and adds no committed baselines.
* Neutral, because it depends on preview-render cost/limits and robust hashing — both flagged.
* Bad, because the guardrail against self-approval is partly a discipline the writable tool makes
  easier to violate.

### B — Approve against the agent's render / synced catalog

* Good, because it is the simplest — the agent already has its output (and can sync it up).
* Bad, because it closes the proof onto the agent's hallucination (P4) — the exact failure this
  record exists to prevent, made *more* tempting by a writable tool.

### C — Trust the spec alone

* Good, because it is the least work — no visual step.
* Bad, because a typed spec (**0062**) can be internally consistent yet not match the design; a
  hallucinated variant passes and there is no seal for later drift (P4/P9).

## More Information

Supersedes **0063**; pairs with **0094** (Claude Design as design source + catalog, superseding
**0045**). Preserves the anti-self-approval principle of **0063**, the human-review posture
(**0047**), the human-approved visual-regression baseline (**0043**), and consumes the
`variants`/`seal` fields of **0062**. The figma `get_image` / `get_code` distinction maps to "render
the Claude Design preview, do not read its source"; `check:seals` is adapted to the Claude Design
project. Realized alongside the premium-UI track (roadmap PR-11+). Revisit if design tooling changes
again — a new record, not an in-place edit.
