# Design reference — mission-control console

A **frozen, version-controlled reference** for the mission-control console re-skin
([ADR 0099](../../decisions/0099-mission-control-product-console-surface.md)). It is the local,
byte-faithful mirror of the published build-reference artifact so the target design survives even if
the hosted artifact is changed or removed.

## Files

- **[`console-build-reference.html`](./console-build-reference.html)** — the combined build reference:
  the bento **Overview** dashboard and the **Events explorer** rendered as one dark instrument panel,
  with a pure-CSS Overview↔Events toggle. Open it directly in a browser (it is a self-contained
  document — inline CSS/SVG, no network requests). Published mirror:
  `https://claude.ai/code/artifact/4be7123e-90c9-482c-b631-903ca889cf02`.

## Status & rules

- **Reference, not shipped code.** This HTML is a design target, not part of the app build. It is
  excluded from the app's token/FSD/Storybook gates and from `prettier` (`.prettierignore`) so it
  stays exactly as designed.
- **Real tokens throughout.** Every value is an ADR 0081 mission-control token (`--surface-*`,
  `--text-*`, `--status-*`, `--viz-*`), oklch 1:1 with `src/app/globals.css`, so the implementation is
  a direct translation — see the phased plan in
  [`../console-redesign-plan.md`](../console-redesign-plan.md).
- **Frozen.** Treat it as immutable. If the design direction changes, publish a new artifact and
  replace this file as a single reviewed update, and note it in
  [`../console-redesign-progress.md`](../console-redesign-progress.md).
