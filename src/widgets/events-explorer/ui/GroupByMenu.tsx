// No "use client": rendered only inside the client leaf (EventsExplorer), which owns
// the boundary (ADR 0002) — the same posture as FacetFilter.
import { Rows3 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { GROUP_BY_VALUES, type GroupBy } from "../model/url-state";

/**
 * GroupByMenu — pick the roll-up dimension (ADR 0098). "none" is the raw-row grid;
 * a dimension swaps in the in-database roll-up (per-value counts from
 * `fn_events_facets`, ADR 0084). The choice is nuqs URL-state at the leaf (ADR 0027),
 * so a grouped view is a shareable link and part of a saved view.
 */
export function GroupByMenu({
  value,
  onChange,
}: {
  value: GroupBy;
  onChange: (value: GroupBy) => void;
}) {
  const t = useTranslations("Events");
  const active = value !== "none";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={active ? "text-text-primary" : "text-text-secondary"}
        >
          <Rows3 aria-hidden className="size-3.5" />
          {active
            ? t("groupByActive", { dimension: t(`facet_${value}`) })
            : t("groupBy")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-border-hairline bg-surface-overlay"
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            // The menu only ever offers grammar values; re-narrow instead of casting.
            const match = GROUP_BY_VALUES.find((option) => option === next);
            if (match !== undefined) onChange(match);
          }}
        >
          {GROUP_BY_VALUES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {option === "none" ? t("groupByNone") : t(`facet_${option}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
