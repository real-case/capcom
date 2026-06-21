# Play-function recipes (ADR 0038)

Canonical patterns per interaction class — these are **patterns**, not registries, so
prose is safe here (P6). Every recipe obeys the two standing rules:

1. **Assert behavior, never render.** A play that only checks "it is in the document"
   duplicates the render smoke the browser-mode run already does. Assert what the
   interaction *changes*: a spy call, an aria attribute, a value.
2. **Assert the *intended* behavior from the spec** (`design-intent.ts` `behavior`, the
   task, the PR description) — never lock in whatever the current implementation
   happens to do (the ADR 0051 guardrail).

Shared mechanics: `import { expect, fn, userEvent, within } from "storybook/test"`;
spies go on callback props via `args: { onX: fn() }` in `meta`; query by **role and
accessible name**, never by class or test-id.

## action-trigger — click fires the handler

```ts
export const Clickable: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Save" });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
```

Worked reference: the `Clickable` story in STORYBOOK-GUARDRAILS.md §7.

## text-input — typing reflects and notifies

Type → assert the value, the per-keystroke spy count, and the payload of the last
change event; then clear and assert the empty notification.

## selection-control — toggle flips the aria state

Assert the *pre*-state first (`aria-pressed`/`aria-checked` false), interact, then
assert the spy. The pre-assertion is what catches a control that renders selected by
mistake.

```ts
await expect(card).toHaveAttribute("aria-pressed", "false");
await userEvent.click(card);
await expect(args.onClick).toHaveBeenCalledTimes(1);
```

## keyboard path — Tab reaches it, Enter/Space activates it

Required for interactive archetypes, not optional (ADR 0039/0052 — the axe gate cannot
see a broken keyboard path):

```ts
export const Keyboard: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Save" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
```

## disclosure — state flips and is announced

Click the trigger → assert `aria-expanded` flipped AND the panel's
visibility/`getByRole` presence changed. Both halves matter: aria without visibility is
a screen-reader-only bug, visibility without aria the reverse.

## async / loading — determinism first

A story that exercises a loading state must be **deterministic** (ADR 0043, the
`preview.tsx` standing rule): mock the async source in the story (a controlled promise
via args, never a live fetch), pin any `new Date()`/`Math.random()` via args or a
decorator, and assert the *transition* (spinner appears → resolves → content), not a
timing.

## accessible name — the component is nameable

For any component whose name comes from composition (icon-only triggers, cards), one
play asserting `getByRole(role, { name })` resolves — the cheapest guard against a
nameless control shipping (ADR 0039).
