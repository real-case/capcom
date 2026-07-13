import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Mission-control mono-data value (ADR 0099 / 0081): an inline tabular numeric/technical
// value in the geist-mono face at the `mono-data` type role, with tabular figures so
// columns of values align (event ids, counts, timestamps, deltas). A presentational leaf
// (archetype:null, like `skeleton` / `label`); the null classification is a 👤 confirmation
// point (ADR 0061). Semantic tokens only (ADR 0058); no external margin. The `tone` axis
// maps to the text hierarchy so a value can recede (secondary) beside its label. Only the
// primary/secondary text roles are exposed — they are the AA-verified pairs over the
// surfaces (`check:contrast`, ADR 0081/0092); `--text-tertiary` is not AA-guaranteed for
// small text and is deliberately not a MonoData tone.
const monoDataVariants = cva("font-mono tabular-nums whitespace-nowrap", {
  variants: {
    tone: {
      primary: "text-text-primary",
      secondary: "text-text-secondary",
    },
  },
  defaultVariants: { tone: "primary" },
});

export function MonoData({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof monoDataVariants>) {
  return (
    <span
      data-slot="mono-data"
      className={cn("text-mono-data", monoDataVariants({ tone }), className)}
      {...props}
    />
  );
}

export { monoDataVariants };
