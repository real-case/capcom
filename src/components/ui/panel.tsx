import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Mission-control surface container (ADR 0099 / 0081): the instrument-panel equivalent
// of the shadcn `card`, themed through the `--surface-*` / `--text-*` / hairline tokens
// so console chrome and data-viz read as one surface. Same `container` archetype as
// Card, but a DISTINCT surface (the mission-control layer, never the shadcn value
// layer — the two are never cross-paired, per the ADR 0099 seam). Semantic tokens only
// (ADR 0058); a primitive owns NO external margin (padding is internal and overridable).
// The `surface` axis is the closed elevation scale over the surface-hierarchy tokens.
const panelVariants = cva(
  "rounded-lg border border-border-hairline p-4 text-text-primary",
  {
    variants: {
      surface: {
        panel: "bg-surface-panel",
        elevated: "bg-surface-elevated",
        overlay: "bg-surface-overlay",
      },
    },
    defaultVariants: { surface: "panel" },
  },
);

export function Panel({
  className,
  surface,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof panelVariants>) {
  return (
    <div
      data-slot="panel"
      className={cn(panelVariants({ surface }), className)}
      {...props}
    />
  );
}

export { panelVariants };
