---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Anti-hallucination component approval and the Figma drift seal

## Context and Problem Statement

When a component's contract is approved against its design (**0062** authored the spec; **0045** made
Figma the read-only design context), the obvious approval flow has a subtle, dangerous flaw: if the
approver is shown *the agent's own rendering or code* beside the spec, the proof closes onto the
agent's hallucination — the agent says "here is what I built and here is the design" and the human
nods at a comparison the agent controls both sides of (problem P4). The same closure appears in visual
regression: an agent approving its own Chromatic baseline (**0043**) is approving its own output as
truth. And once a variant *is* approved, nothing detects that the underlying Figma frame later changed
— the approval silently goes stale (problem P9). This record defines an approval protocol whose proof
the agent cannot author, and a lightweight **drift seal** that detects when an approval has gone stale.
It extends **0043** (visual regression), **0045** (Figma read-only handoff), and **0047** (human review).

## Decision Drivers

* **Proof the agent does not control** — the comparison must be the *real Figma frame* (pixels from the
  design tool) beside the spec, never the agent's implementation or the agent's code, or approval
  validates the hallucination instead of catching it (P4).
* **Read-only Figma, image not code** — consistent with **0045**'s least-privilege posture, use the
  figma server's *rendered-image* capability, never its code-generation capability (the plan's
  `get_image`-not-`get_code` rule; on this server's toolset that is `get_screenshot`, not the
  code-generation / Code-Connect tools).
* **Detect drift, do not snapshot** — after approval, storing the agent's render as truth would re-create
  the P4 closure; instead store a *seal* that flags when the design moved (P9).
* **Ephemeral artifact, durable seal** — the side-by-side reconciliation artifact is a review aid,
  discarded after approval; only the seal persists in the intent file.
* **Baseline approval is human-only** — the agent never approves its own visual baseline, the same
  closure-onto-output as showing its implementation (**0047**).

## Considered Options

* **Ephemeral Figma-image reconciliation artifact + a persistent `ApprovalSeal` drift detector** — approve
  each variant against its real Figma frame (image only), discard the artifact, keep only the seal
* **Approve against the agent's rendered implementation / committed screenshots** — compare what the agent
  built to the design
* **Trust the spec** — approve `design-intent.ts` (**0062**) on its own, no visual reconciliation

## Decision Outcome

Chosen option: "ephemeral Figma-image reconciliation artifact + a persistent `ApprovalSeal`", because it is
the only option where the approval evidence is something the agent cannot fabricate, and the only one that
keeps catching drift after the fact. At API approval, the agent assembles an **ephemeral reconciliation
artifact**: each variant beside its real Figma frame fetched via the server's *image* capability (**never**
its code-generation capability), plus the deep link, the agent's interpretation, and a traversal-completeness
report — and it **does not show its own implementation**. The human approves against the Figma pixels. After
approval the artifact is **discarded**; the only trace left in `design-intent.ts` is an **`ApprovalSeal`**:
`renderHash` (of the approved Figma node render) + `figmaFileVersion`. The seal is a **drift detector, not a
snapshot** — a Stage-1 fitness function re-renders the node by ID and compares the hash; a mismatch means the
design moved and **re-opens the affected variants for re-approval** (P9). **Visual-regression baseline approval
(0043) is human-only**, for the same reason the agent is never shown its own implementation: approving one's
own output as the baseline is the closure this record exists to break. `behavior` (ref-forwarding, controlled
state, aria, focus) is engineering-built and out of this visual protocol (**0062**). Figma `get_image` rate
limits are an open risk the plan flags to check before the first multi-component wave.

### Consequences

* Good, because the approver compares the spec to design pixels the agent did not produce, so a hallucinated
  variant cannot be rubber-stamped as matching (P4) — the proof is structurally outside the agent's control.
* Good, because the seal turns a one-time approval into a standing check: when the Figma frame changes, the
  hash mismatch re-opens exactly the affected variants rather than letting the approval silently rot (P9).
* Good, because discarding the artifact and keeping only the seal avoids storing the agent's render as truth,
  which would re-introduce the very closure being prevented.
* Bad, because per-variant Figma image fetches consume rate limit; a 6+-component wave fetching all variants
  can hit it "at the worst moment" — an open question the plan tracks before wave 1.
* Bad, because `renderHash` is sensitive to benign render noise; the hashing must tolerate non-semantic
  variation or it produces false drift and re-approval churn (the calibration risk shared with **0043**).

### Confirmation

A sampled component's approval artifact shows Figma frames (server image capability) beside the spec and
**not** the agent's implementation or code; after approval the artifact is gone and `design-intent.ts` carries
an `ApprovalSeal` (`renderHash` + `figmaFileVersion`) per approved variant. A fitness function re-renders by
node ID and re-opens variants on a hash mismatch. Visual-regression baselines are approved only in the
Chromatic UI by a human (**0043**/**0047**), never by the agent. The figma server remains read-only and the
code-generation capability is not used in this flow (**0045**). Subject to the **0054** drift audit once
accepted.

## Pros and Cons of the Options

### Ephemeral Figma-image artifact + ApprovalSeal (chosen)

* Good, because approval evidence is agent-uncontrollable pixels, and the seal keeps detecting drift.
* Good, because it adds no committed image baselines (consistent with **0043**'s zero-`*.png` posture).
* Neutral, because it depends on Figma image rate limits and robust hashing — both flagged risks.
* Bad, because hash calibration and rate limits are real operational concerns to tune.

### Approve against the agent's render / screenshots

* Good, because it is the simplest to assemble — the agent already has its output.
* Bad, because it closes the proof onto the agent's hallucination (P4): the human approves a comparison both
  sides of which the agent authored — the exact failure this record prevents.

### Trust the spec alone

* Good, because it is the least work — no visual step.
* Bad, because a typed spec (**0062**) can be internally consistent and still not match the design; without a
  pixel comparison, a hallucinated variant passes, and there is no seal to catch later drift (P4/P9).

## More Information

Extends **0043** (visual regression — baselines stay human-approved), **0045** (Figma read-only, image not
code), and **0047** (human review of agent output). Consumes the `variants`/`seal` fields of **0062** and
operates within the read-only figma posture of **0045**/**0044**; the plan's `get_image`/`get_code`
distinction maps to this server's screenshot vs. code-generation tools. Complements **0053**, which deferred
AI pre-classification of visual diffs — this record adds no diff-classification machinery, only the seal.
Figma image rate limits and an image-generation provider for showcase artifacts are open questions the plan
carries. Confirms problems P4 (API hallucination) and P9 (post-approval drift). All
baseline/variant approvals are human actions (**0046**/**0047**).
