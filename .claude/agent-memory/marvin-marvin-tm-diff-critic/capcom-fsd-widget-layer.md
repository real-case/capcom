---
name: capcom-fsd-widget-layer
description: FSD layering in this repo — widgets are above features; the legit pattern for a feature-with-charts
metadata:
  type: project
---

This repo enforces Feature-Sliced Design via Steiger (`check:fsd`, ADR 0065/0066). Layer order (high→low): `app` > `widgets` > `features` > `entities` > `shared`. Imports go downward only; same-layer slices cannot import each other; every slice is reached through its public `index.ts`.

**Consequence seen in PR-4:** a spec that splits into `features/trends-explorer` + `widgets/trends-chart` + `widgets/top-events-bar` is INVALID — a `features` slice cannot import the higher `widgets` layer, and two sibling `widgets` cannot import each other. The legitimate consolidation is **one `widgets/trends-explorer` slice** with the charts as internal `ui/` segments (`ui/TrendsChart.tsx`, `ui/TopEventsBar.tsx`), all wired by relative intra-slice imports (`../api`, `../model`, `./TrendsChart`), and only the top-level component exported from `index.ts`. This also keeps the charts under `src/widgets/**` so the ADR-0058 token gate (extended to widgets) still lints their SVG. See [[capcom-token-gate-mechanics]].

**How to apply:** when a spec's file allowlist puts a chart-consuming `feature` alongside chart `widgets`, expect the implementer to consolidate into one widget slice — that is FSD-correct, not scope drift. Verify the consolidation kept each chart independently storied/testable and didn't route intra-slice imports through the public index (which would be a real boundary leak).
