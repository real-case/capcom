import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Mission-control hairline (ADR 0099 / 0081): a 1px rule on the hairline or divider token
// for separating console regions, panel sections, and table rows. A presentational leaf
// (archetype:null, like `skeleton`); the null classification is a 👤 confirmation point
// (ADR 0061). Decorative by default (no role — an empty rule is invisible to AT); pass
// `role="separator"` for the semantic case. Semantic tokens only (ADR 0058); no external
// margin. `orientation` sizes the rule; `tone` picks the hairline vs the heavier divider.
const hairlineVariants = cva("shrink-0 border-0", {
  variants: {
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
    tone: {
      hairline: "bg-border-hairline",
      divider: "bg-divider",
    },
  },
  defaultVariants: { orientation: "horizontal", tone: "hairline" },
});

export function Hairline({
  className,
  orientation,
  tone,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof hairlineVariants>) {
  return (
    <div
      data-slot="hairline"
      className={cn(hairlineVariants({ orientation, tone }), className)}
      {...props}
    />
  );
}

export { hairlineVariants };
