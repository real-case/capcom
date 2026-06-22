import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Mission-control status palette (ADR 0081): an ordered severity indicator built on
// the status-{nominal|caution|warning|critical} fg/bg/border token triplets. Semantic
// tokens only (ADR 0058); a primitive owns NO external margin. The leading dot is
// decorative (aria-hidden) and inherits the level colour via `bg-current`, so the
// accessible name is the label text alone.
const statusIndicatorVariants = cva(
  "inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      level: {
        nominal:
          "border-status-nominal-border bg-status-nominal-bg text-status-nominal-fg",
        caution:
          "border-status-caution-border bg-status-caution-bg text-status-caution-fg",
        warning:
          "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
        critical:
          "border-status-critical-border bg-status-critical-bg text-status-critical-fg",
      },
    },
    defaultVariants: { level: "nominal" },
  },
);

export function StatusIndicator({
  className,
  level,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof statusIndicatorVariants>) {
  return (
    <span
      data-slot="status-indicator"
      className={cn(statusIndicatorVariants({ level }), className)}
      {...props}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export { statusIndicatorVariants };
