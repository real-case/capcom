"use client";

import * as React from "react";
import { format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function formatRange(range: DateRange | undefined): string | null {
  if (!range?.from) return null;
  if (!range.to) return format(range.from, "LLL d, y");
  return `${format(range.from, "LLL d, y")} – ${format(range.to, "LLL d, y")}`;
}

/**
 * DateRangePicker — a from/to range selector (`selection-control`). A composite of
 * Popover (disclosure) + Calendar (the range grid) + Button (the trigger); the premium
 * replacement for the paired native date inputs (wired into the analysis surfaces in
 * PR-15). The trigger placeholder is passed in as a prop so a server shell localizes it
 * (the `ThemeToggle` pattern, ADR 0030); the selected range is formatted via date-fns.
 */
function DateRangePicker({
  value,
  onValueChange,
  placeholder = "Pick a date range",
  disabled,
  numberOfMonths = 2,
  align = "start",
  className,
  id,
  "aria-invalid": ariaInvalid,
  "aria-labelledby": ariaLabelledby,
}: {
  value?: DateRange;
  onValueChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  numberOfMonths?: number;
  align?: "start" | "center" | "end";
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-labelledby"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const label = formatRange(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-labelledby={ariaLabelledby}
          data-slot="date-range-picker-trigger"
          data-empty={!label}
          className={cn(
            "w-full justify-start gap-2 font-normal data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
          <span className="truncate">{label ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto p-0"
        data-slot="date-range-picker-content"
      >
        <Calendar
          mode="range"
          autoFocus
          defaultMonth={value?.from}
          selected={value}
          onSelect={onValueChange}
          numberOfMonths={numberOfMonths}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DateRangePicker };
