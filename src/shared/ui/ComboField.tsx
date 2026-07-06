import { useId } from "react";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

/**
 * A labelled Combobox — the accessible, premium replacement for a native `<select>`
 * (ADR 0034, PR-15). The visible label names the trigger via `aria-labelledby` (a
 * `role="combobox"` element takes its name from the reference, not its text content), so a
 * consumer's URL-state contract (ADR 0027) is unchanged — only the control is. Shared
 * across the analytics widgets (trends / funnels / retention / segments) so the wrapper is
 * defined once rather than per widget.
 *
 * No `"use client"` directive of its own: it renders the client `Combobox` and calls
 * `useId`, but is only ever composed inside the analytics widgets, which are the client
 * boundary — so it inherits their client-ness (as the inline version did) rather than
 * becoming a client entry with non-serializable function props.
 */
export function ComboField({
  label,
  value,
  options,
  onValueChange,
  searchPlaceholder,
  emptyText,
  className = "w-44",
}: {
  label: string;
  value: string;
  options: readonly ComboboxOption[];
  onValueChange: (value: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  className?: string;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      <span id={labelId}>{label}</span>
      <Combobox
        aria-labelledby={labelId}
        value={value}
        options={options}
        onValueChange={onValueChange}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        className={className}
      />
    </div>
  );
}
