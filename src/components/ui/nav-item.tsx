import * as React from "react";
import { Slot as SlotPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Mission-control nav item (ADR 0099 / 0081): a navigation link row on the instrument-panel
// surface — the first INTERACTIVE mission-control primitive. `action-trigger` archetype (a
// link, ADR 0061). Presentational: routing is delegated via `asChild` (the `radix-ui`
// umbrella `Slot`, the convention the kit follows) so the consumer passes its own Link — the
// icon+label are the child's content — and the kit never imports app routing (ADR 0065/0066).
// `active` marks the current section (aria-current="page" + the active surface). Semantic
// tokens only (ADR 0058); a primitive owns NO external margin. The focus ring uses the
// mission-control text token so it reads on the surface hierarchy.
const navItemVariants = cva(
  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      active: {
        true: "bg-surface-elevated text-text-primary",
        false:
          "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
      },
    },
    defaultVariants: { active: false },
  },
);

export function NavItem({
  className,
  active = false,
  asChild = false,
  ...props
}: React.ComponentProps<"a"> &
  VariantProps<typeof navItemVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Root : "a";
  return (
    <Comp
      data-slot="nav-item"
      data-active={active ? "" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(navItemVariants({ active }), className)}
      {...props}
    />
  );
}

export { navItemVariants };
