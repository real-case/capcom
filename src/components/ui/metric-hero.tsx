import * as React from "react";

import { cn } from "@/lib/utils";

// Mission-control metric hero (ADR 0099 / 0081): a large KPI value rendered in the
// geist-mono numeric face (`--font-mono`, the technical/numeric face per 0081) at the
// `metric-hero` type role, with an optional label above and tabular figures so stacked
// metrics align. A presentational leaf (archetype:null, like `skeleton` / `label`); the
// null classification is a 👤 confirmation point (ADR 0061). Semantic tokens only
// (ADR 0058); a primitive owns NO external margin. The value is `children`.
export function MetricHero({
  label,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { label?: React.ReactNode }) {
  return (
    <div
      data-slot="metric-hero"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      {label != null && (
        <span
          data-slot="metric-hero-label"
          className="text-label text-text-secondary"
        >
          {label}
        </span>
      )}
      <span
        data-slot="metric-hero-value"
        className="text-metric-hero text-text-primary font-mono tabular-nums"
      >
        {children}
      </span>
    </div>
  );
}
