---
name: story-verify
description: >-
  Verify one component's stories after authoring or changing them — the scoped
  browser-mode Vitest run (play functions + the axe a11y gate over every story), the
  scoped design-intent fitness functions, and an optional screenshot pass that collects
  visual evidence FOR THE HUMAN. Use after writing or editing *.stories.tsx, after
  story-matrix, or when asked "verify the stories", "do the stories pass", "run the
  story tests for X", or "/story-verify <id>".
---

# Story verify — the scoped post-authoring loop

The full sweep (`pre-pr-gate`) is heavy; this is the **fast, component-scoped** loop you
run right after touching a stories file, so a play failure, an axe violation, or a
broken states↔stories link surfaces now — not in CI. It only runs checks (no edits).

> Node 24 is required (`engines.node >=24 <25`). If `node -v` is not v24.x, prepend the
> project's Node 24 to `PATH` before any command below (see `.nvmrc`).

## 1. Scoped browser-mode run (ADR 0037/0035)

```bash
npx vitest run --project=storybook src/components/ui/<id>.stories.tsx
```

Every story renders as a real browser test; **two failure classes land here**:

- **Play failures** (ADR 0038) — an interaction assertion did not hold. Fix the
  component or the assertion, depending on which one contradicts the spec
  (`design-intent.ts` `behavior` is the authority — never re-fit the assertion to
  broken behavior, the ADR 0051 guardrail).
- **Axe violations** (ADR 0039 — `a11y.test: "error"`, WCAG 2.2 AA). Fix at the
  markup/token level, by rule family:
  - `color-contrast` → a token choice; check the semantic token against the dark axis
    too (the `Dark` story runs axe under `.dark`). Never a raw color (ADR 0058).
  - `button-name` / `link-name` / `label` → a missing accessible name; add
    `aria-label` or visible text (see the IconOnly pattern in `button.stories.tsx`).
  - `aria-*` rules → a role/attribute contract broken in the component, not the story.
  - An opt-out is **only** an explicit per-story `a11y` parameter with a stated reason,
    reviewed in the PR (ADR 0039) — never a silent disable, never meta-level.

## 2. Scoped gates (ADR 0062 / 0042)

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-design-intent.mjs --component <id>
npm run check:stories
```

The first reconciles the quartet: stale `demoStory` links, an `applicable:true` state
with neither `demoStory` nor `demoRationale` (ADR 0062), a missing `play` for an
interactive archetype (ADR 0038), undeclared `state:` tags. The second proves every
component module still has a colocated stories file.

## 3. Optional — visual evidence for the human (👤 judges, never the agent)

When the change is visual (new states, token changes, layout), collect screenshots so
the human can judge quickly. **ADR 0063 boundary, stated plainly: these screenshots are
advisory evidence for human review. The agent never approves a visual baseline, never
treats its own render as proof of design correctness, and Chromatic UI approval is
human-only (ADR 0043/0047).** Flagging an obvious breakage (blown-out layout, missing
content) is fine — that is a defect report, not an approval.

```bash
npm run storybook        # serve the workbench (background)
```

Then drive the playwright MCP to each story's iframe URL and screenshot:

```
http://localhost:6006/iframe.html?id=<story-id>                       # light
http://localhost:6006/iframe.html?id=<story-id>&globals=theme:dark    # dark axis
```

(`<story-id>` is the lowercased title/export path, e.g. `ui-servicecard--selected`;
read the exact ids from the sidebar or `index.json`.) Present the set to the user with
the story names labeled.

## 4. Report

End with the pre-pr-gate-style checklist — every step, pass or fail, no stopping at the
first red:

```
story-verify: <id>
  ✓/✗ browser-mode run (N stories, play + axe)      [vitest --project=storybook]
  ✓/✗ design-intent quartet (scoped)                [check-design-intent --component]
  ✓/✗ story colocation                              [check:stories]
  ◻  visual evidence: N screenshots attached (👤 to judge)
```

Map each ✗ to its fix at the source; if everything is green, say so plainly.
