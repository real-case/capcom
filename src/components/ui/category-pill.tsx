import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mission-control categorical pill (ADR 0099 / 0081): a categorical VALUE rendered as a
// chip with an optional leading data-viz hue dot — the instrument-panel expression of a
// category (plan tier, dimension value, event name). `categorical-indicator` archetype
// (badge/tag/chip, ADR 0061), but a DISTINCT composite: it COMPOSES `Badge`
// (compositionSignature ["badge"]) themed through the mission-control surface, so it reuses
// the chip rather than duplicating the `Badge` leaf — the clean resolution to the ADR 0059
// collision that dropped StatusPill in Phase A. Where `Badge`'s `variant` is a neutral/
// status axis and `StatusIndicator`'s `level` is severity, this expresses a colorblind-safe
// data-viz hue (ADR 0081/0086). Semantic tokens only (ADR 0058); a primitive owns NO external
// margin. The `hue` is a `var(--color-viz-*)` token supplied by the consumer (e.g. `eventHue`)
// and applied to the decorative (aria-hidden) dot via inline style — a variable, never a raw
// literal, so the token gate stays green (the `eventHue` precedent).
export function CategoryPill({
  className,
  hue,
  children,
  ...props
}: React.ComponentProps<"span"> & { hue?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-border-hairline font-normal text-text-primary",
        className,
      )}
      {...props}
    >
      {hue !== undefined ? (
        <span
          aria-hidden
          data-slot="category-pill-dot"
          className="size-2 shrink-0 rounded-[3px]"
          style={{ background: hue }}
        />
      ) : null}
      {children}
    </Badge>
  );
}
