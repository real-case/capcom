---
name: new-component
description: >-
  Scaffold a new src/components/** component through the full Definition-of-Ready
  ceremony — composition-signature duplicate check (ADR 0059), archetype/usage-role
  classification against the controlled vocabularies (ADR 0061), state coverage by
  subtraction (ADR 0062), the colocated tsx/stories/test/design-intent quartet, and
  composition-graph registration — then run the design-system gates. Use when asked to
  "create/add a component", "scaffold a component", "new badge/switch/…", or
  "/new-component <Name>".
disable-model-invocation: true
---

# Scaffold a governed component (Definition-of-Ready ceremony)

Creating a component here is a **ceremony**, not a file drop: the contract is *designed*
before it is implemented (ADR 0062), checked for structural duplication (ADR 0059),
classified against human-authored vocabularies (ADR 0061), and covered by subtraction
from a mandatory state set (ADR 0062). This skill walks that path and ends with the
gates green. It has side effects (creates/edits files), so it is **user-invoked only**.

> Node 24 is required (`engines.node >=24 <25`). If `node -v` is not v24.x, prepend the
> project's Node 24 to `PATH` before any `npm run` below (see `.nvmrc`).

Run the steps **in order** — each gates the next.

## 0. Decide the name, kind, and where it lives
- **Name:** PascalCase export (`Badge`), kebab module (`badge.tsx`).
- **Location:** `src/components/ui/<name>.tsx` for a reusable catalogue component. (One-off
  page compositions live in `src/app/**` and are out of this catalogue — ADR 0007/0042.)
- **Scope — this skill is the `src/components/ui` kit ONLY.** That kit is the shadcn primitive
  catalogue, governed by dependency-cruiser and the design-system gates (ADR 0034 / 0058–0062, 0064, 0095)
  and is deliberately **outside** the Feature-Sliced Design model (ADR 0065). **Slice-specific,
  domain-aware UI** (a feature's `ui` segment, a widget, an entity's presentational pieces)
  does **not** belong here — it goes through the **`new-slice`** skill into
  `src/{features,widgets,entities}`, where it *composes* these primitives via
  `src/components/ui/index.ts`. If what you are building knows about the domain, stop and use
  `new-slice` instead.
- **Kind:** `primitive` (no other component inside it) or `composite` (composed of other
  primitives). A composite imports primitives **through `src/components/ui/index.ts`**, never
  deep — and a primitive never imports a composite (ADR 0060).

## 1. Duplicate check FIRST — do not skip (ADR 0059, P2)
Before writing anything, check the composition graph for the same structure:

```bash
npm run ds:signature                 # inventory + how to compute a v1 signature
```

The v1 signature is the **sorted set of composed primitive ids**. If an existing component
has the same signature (or a near-match), **stop and surface it to the user** — a duplicate
is a human decision, not an agent default. For a primitive the signature is `[]`; still scan
the graph for an existing component of the same archetype + usage role.

## 2. Classify against the controlled vocabularies (ADR 0061) — 👤 boundary
Pick from the **human-authored** closed lists. Never add an entry yourself.

- **Archetype** — `src/design-system/archetypes.ts` (`action-trigger`, `text-input`,
  `selection-control`, `categorical-indicator`, `collection`, `container`, `feedback`,
  `navigation`, `media`, `disclosure`). Purely presentational leaves may be `archetype: null`
  (like `label`).
- **Usage role** — `src/design-system/usage-roles.ts` (`action-trigger`, `selection-control`,
  `text-input`, `categorical-status-indicator`, `risk-level-indicator`), or `null`.

**If nothing fits**, a new archetype/role is a design-system decision — **escalate to a human
and stop** (ADR 0061/0064). Do not stretch an existing entry to make it fit.

## 3. State set by subtraction (ADR 0061/0062, P8)
Get the mandatory states for the chosen archetype:

```bash
npm run ds:states -- <archetype>     # e.g. --  categorical-indicator
```

You will mark each state `applicable: true/false` in `design-intent.ts` (step 4d). A
`false` **requires a rationale** — that is how coverage stays visible instead of silently
dropped. Each `applicable: true` state needs a story case (`demoStory`) **or** a recorded
`demoRationale` for why no static story can demo it (transient `:hover`/`:active`, …) —
`check:design-intent` enforces both directions (ADR 0062).

## 4. Scaffold the quartet
Create four colocated files. Templates below use `Badge` (`categorical-indicator` /
`categorical-status-indicator`) as a concrete example — adapt names, axes, and states.
**Match `button.tsx` for imports and token usage**: `cn` from `@/lib/utils`, `cva` from
`class-variance-authority`, `radix-ui` for primitives, and **only semantic tokens**
(`bg-primary`, `text-primary-foreground`, …) — never a raw literal (ADR 0058; the
allowed list is `src/design-system/tokens.agent-rules.md`, never re-listed in prose).

### 4a. `src/components/ui/<name>.tsx`
```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base: semantic tokens only. A primitive owns NO external margin (ADR 0058).
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { badgeVariants };
```

### 4b. `src/components/ui/<name>.stories.tsx` (CSF 3, ADR 0036/0042)
Derive the story set with the **`story-matrix`** skill — it reads the spec + registry and
lists the required exports (one per `applicable:true` state, Variants/Overview, Dark,
data-edge). An archetype whose **mandatory axes include `interaction`** (`ds:states`
shows this) **requires a `play`** with `storybook/test` (ADR 0038 — gate-enforced,
ADR 0038); play patterns live in `story-matrix/assets/play-recipes.md`. Wire each story
back as the state's `demoStory` in step 4d, and verify with the **`story-verify`** skill.
```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";

const meta = {
  component: Badge,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: "Stable" } };
export const Secondary: Story = { args: { variant: "secondary", children: "Beta" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Down" } };
export const Outline: Story = { args: { variant: "outline", children: "Draft" } };

// Data-edge: a long label must truncate, not blow out layout (ADR 0042).
export const LongLabel: Story = {
  args: { children: "a-deliberately-long-unbroken-status-token" },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  args: { children: "Stable" },
};
```

### 4c. `src/components/ui/<name>.test.tsx` (colocated unit, ADR 0007/0008)
```tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Badge } from "./badge";

test("renders its label", () => {
  render(<Badge>Stable</Badge>);
  expect(screen.getByText("Stable")).toBeInTheDocument();
});

test("applies the variant token class", () => {
  render(<Badge variant="secondary">Beta</Badge>);
  expect(screen.getByText("Beta")).toHaveClass("bg-secondary");
});
```

### 4d. `src/components/ui/<name>.design-intent.ts` (the SPEC — ADR 0062)
Author this as the **specification**: `meta` reconciles with the composition graph,
`api` is derived from the `usedIn` call-sites (not guessed), and `states` is the archetype
set from step 3 with every entry marked applicable true/false (a `false` carries a
rationale). `tokens` are typed from the registry — never literals. The inline example below is the
shape to follow (this template ships no components yet; STORYBOOK-GUARDRAILS.md §7 walks
through a full `action-trigger` quartet).
```ts
import type { DesignIntent } from "@/design-system/design-intent";

export const badgeIntent = {
  meta: {
    id: "badge",
    kind: "primitive",
    archetype: "categorical-indicator",
    compositionSignature: [], // sorted set of composed primitive ids; [] for a leaf
    composedOf: [],
    usedIn: [], // fill from real call-sites as they land; API is derived from this union
  },
  usageRole: "categorical-status-indicator",
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). Closed axes live in api.variants; per-variant design references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    // From `npm run ds:states -- categorical-indicator`. Mark each applicable
    // true/false; a `false` REQUIRES a rationale (ADR 0062, P8). Each `true`
    // needs a `demoStory` (step 4b) OR a `demoRationale` (ADR 0062), and a token
    // where it relies on one.
    {
      name: "default",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-primary", "--color-primary-foreground"],
    },
    // … the remaining mandatory states for this archetype …
  ],
  combinations: {
    orthogonalAxes: ["variant"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [],
    variants: [
      {
        prop: "variant",
        values: ["default", "secondary", "destructive", "outline"],
        rationale: "A fixed, finite set of status intents — a closed axis, not a slot.",
      },
    ],
    ownsExternalMargin: false, // a primitive carries no external margin (ADR 0058)
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: [],
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;
```

## 5. Register in the composition graph (ADR 0059/0060)
`src/design-system/composition-graph.json` is the **hand-maintained** top-down graph. Add a
node mirroring `design-intent.ts` `meta` (it is reconciled against the import graph):
```json
{
  "id": "badge",
  "kind": "primitive",
  "archetype": "categorical-indicator",
  "module": "src/components/ui/badge.tsx",
  "composedOf": [],
  "usedIn": [],
  "compositionSignature": []
}
```
Keep `usedIn` in step 4d and here in sync as real call-sites land — `check:graph` reconciles
them. A composite's `composedOf`/`compositionSignature` must list its primitive ids exactly.

## 6. Run the gates — green before done
```bash
npm run check:stories          # colocated story exists (ADR 0042)
npm run check:tokens           # semantic-token gate over the new file (ADR 0058)
npm run check:boundaries       # import boundaries (ADR 0060)
npm run check:graph            # composition ↔ import reconciliation (ADR 0059/0060)
npm run check:design-intent    # api↔props, state coverage, states↔stories (ADR 0062)
npm run check:design-system    # runs the whole bundle (+ i18n, seals)
npx tsc --noEmit               # a bad archetype/role/token reference fails typecheck
npm run test:unit              # the colocated unit test
```
Fix every red gate at its source (a token violation → swap to a semantic token; a missing
state → add the story + intent entry). A clean `check:design-system` + `tsc` means the
component is at Definition-of-Ready.

## 7. The human gates that remain (👤 — do not perform)
These stay human-owned (ADR 0046/0047/0061/0095), so **surface them and stop**:
- A new **archetype or usage role** (step 2 had no fit).
- **API approval** against real **Claude Design** pixels and the resulting **drift seal** — the
  agent is never shown its own render for this (ADR 0095).
- The **Chromatic** visual baseline (ADR 0043) and **merging** into `dev`/`main`.

End by reporting: the files created, the gate results, and any 👤 escalation the user must take next.
