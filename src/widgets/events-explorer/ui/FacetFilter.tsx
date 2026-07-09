// No "use client": rendered only inside the client leaf (EventsExplorer), which owns the
// boundary (ADR 0002) — the same posture as EventsTable. Its facet counts come from the
// `SECURITY INVOKER` fn_events_facets RPC (ADR 0084), never a client-side tally.
import { ListFilter } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { useEventsFacets } from "../api/use-events";
import {
  FACET_VALUES,
  facetSelection,
  type EventsFilter,
  type FacetDimension,
} from "../model/filter";
import { toFacetsArgs } from "../model/url-state";

/** Humanize a facet value for display (event names carry underscores; codes stay as-is). */
function facetLabel(dimension: FacetDimension, value: string): string {
  return dimension === "event" ? value.replace(/_/g, " ") : value;
}

/**
 * FacetFilter — a multi-select popover for one filter dimension (PR-17, ADR 0097). The
 * trigger shows the dimension label and a count of active selections; the popover lists the
 * curated value vocabulary with a **database-computed count** beside each (fetched only while
 * open, and re-fetched as the active filter changes so the numbers stay honest). Selection
 * toggles bubble up to the leaf, which writes them to nuqs URL-state (ADR 0027) — this control
 * owns no filter state and no reduction.
 */
export function FacetFilter({
  projectId,
  dimension,
  filter,
  onToggle,
  onClear,
}: {
  projectId: string;
  dimension: FacetDimension;
  filter: EventsFilter;
  onToggle: (dimension: FacetDimension, value: string) => void;
  onClear: (dimension: FacetDimension) => void;
}) {
  const t = useTranslations("Events");
  const [open, setOpen] = useState(false);
  const selected = facetSelection(filter, dimension);
  const facets = useEventsFacets(toFacetsArgs(projectId, filter, dimension), {
    enabled: open,
  });
  const counts = new Map(
    (facets.data ?? []).map((facet) => [facet.value, facet.count]),
  );
  const label = t(`facet_${dimension}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed"
          aria-label={t("filterBy", { dimension: label })}
        >
          <ListFilter aria-hidden className="size-3.5" />
          {label}
          {selected.length > 0 ? (
            <>
              <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal tabular-nums"
              >
                {selected.length}
              </Badge>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          <CommandInput placeholder={t("facetSearch", { dimension: label })} />
          <CommandList>
            <CommandEmpty>{t("facetEmpty")}</CommandEmpty>
            <CommandGroup>
              {FACET_VALUES[dimension].map((value) => (
                <CommandItem
                  key={value}
                  value={value}
                  data-checked={selected.includes(value)}
                  onSelect={() => onToggle(dimension, value)}
                >
                  <span className="truncate capitalize">
                    {facetLabel(dimension, value)}
                  </span>
                  <span
                    className={cn(
                      "ms-auto tabular-nums text-xs text-muted-foreground",
                      // ms-auto pushes the count to the inline-end; the built-in
                      // CommandItem check follows it (internal layout, ADR 0058).
                    )}
                  >
                    {facets.isLoading ? "…" : (counts.get(value) ?? 0)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {selected.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => onClear(dimension)}
                    className="justify-center text-center text-muted-foreground"
                  >
                    {t("facetClear")}
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
