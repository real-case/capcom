# Storybook reviewer memory index

- [demoRationale keyboard-claim anti-pattern](antipattern-keyboard-claim-vs-play.md) — recurring: focus-visible demoRationale says "exercised by the X play (keyboard)" but the play uses click/hover only. Seen across PR-12 kit.
- [Play keyboard-path coverage gap](antipattern-play-no-keyboard-path.md) — interactive-archetype plays assert click behavior but skip the keyboard path (Tab/Enter/Escape/arrows) that axe can't see (ADR 0039/0052). Gate only checks play *presence*.
- [DL rule-gap candidates](rule-gap-candidates.md) — proposed Defect Log entries: keyboard-path assertion for interactive plays; demoRationale-must-match-cited-play honesty check.
- [Kit conventions in capcom](capcom-primitive-kit-conventions.md) — sound patterns this repo uses: isChromatic() freeze in preview.tsx, portalled content via screen + toBeInTheDocument (not toBeVisible), cmdk aria-required-children scoped opt-out.
