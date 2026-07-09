// No "use client": rendered only inside the client leaf (EventsExplorer), which owns the
// boundary (ADR 0002) — the same posture as EventsTable / FacetFilter. It owns only the
// ephemeral search-input text; the committed filter lives in nuqs URL-state at the leaf.
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  activeChips,
  FACET_DIMENSIONS,
  isFilterActive,
  type EventsFilter,
  type FacetDimension,
  type FilterChip,
} from "../model/filter";

import { FacetFilter } from "./FacetFilter";

/**
 * EventsToolbar — the query controls above the table (PR-17, ADR 0097): free-text search over
 * the event name, the four facet popovers, the active-filter chips, and clear-all. The search
 * text is debounced local state (ADR 0028: debounce network) that commits up to the leaf; every
 * other control writes straight through. The committed filter is nuqs URL-state owned by the
 * leaf, so a filtered view is a shareable link (ADR 0027) — this component holds no filter state.
 */
export function EventsToolbar({
  projectId,
  filter,
  onSearchChange,
  onToggleFacet,
  onClearFacet,
  onClearAll,
}: {
  projectId: string;
  filter: EventsFilter;
  onSearchChange: (search: string) => void;
  onToggleFacet: (dimension: FacetDimension, value: string) => void;
  onClearFacet: (dimension: FacetDimension) => void;
  onClearAll: () => void;
}) {
  const t = useTranslations("Events");
  const [text, setText] = useState(filter.search);
  const [committed, setCommitted] = useState(filter.search);

  // Sync the input when the committed search changes externally (clear-all, shared link) — the
  // documented "adjust state during render" pattern (guarded so it can't loop), not an effect,
  // so a page fetch isn't chained off a render-phase setState.
  if (filter.search !== committed) {
    setCommitted(filter.search);
    setText(filter.search);
  }

  // Debounce the commit so a page fetch isn't fired on every keystroke (ADR 0028). Only fires
  // when the local text has diverged from the committed value, so mount and echo-backs are no-ops;
  // the commit itself is async (setTimeout), never a synchronous setState in the effect body.
  useEffect(() => {
    if (text === filter.search) return;
    const id = setTimeout(() => onSearchChange(text), 300);
    return () => clearTimeout(id);
  }, [text, filter.search, onSearchChange]);

  const chips = activeChips(filter);

  const removeChip = (chip: FilterChip) => {
    if (chip.kind === "search") {
      setText("");
      onSearchChange("");
    } else {
      onToggleFacet(chip.dimension, chip.value);
    }
  };

  const chipLabel = (chip: FilterChip): string =>
    chip.kind === "search"
      ? t("chipSearch", { value: chip.value })
      : t("chipFacet", {
          dimension: t(`facet_${chip.dimension}`),
          value: chip.value,
        });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-3.5 text-muted-foreground"
          />
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-8 w-56 rounded-md border border-input bg-transparent ps-8 pe-7 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {text !== "" ? (
            <button
              type="button"
              onClick={() => setText("")}
              aria-label={t("searchClear")}
              className="absolute inset-y-0 end-1.5 my-auto inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </div>

        {FACET_DIMENSIONS.map((dimension) => (
          <FacetFilter
            key={dimension}
            projectId={projectId}
            dimension={dimension}
            filter={filter}
            onToggle={onToggleFacet}
            onClear={onClearFacet}
          />
        ))}

        {isFilterActive(filter) ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-muted-foreground"
          >
            {t("clearAll")}
            <X aria-hidden className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <ul
          className="flex flex-wrap items-center gap-1.5"
          aria-label={t("activeFilters")}
        >
          {chips.map((chip) => {
            const key =
              chip.kind === "search"
                ? "search"
                : `${chip.dimension}:${chip.value}`;
            const label = chipLabel(chip);
            return (
              <li key={key}>
                <Badge
                  variant="outline"
                  className="gap-1 py-0.5 pe-1 font-normal"
                >
                  <span className="capitalize">{label}</span>
                  <button
                    type="button"
                    onClick={() => removeChip(chip)}
                    aria-label={t("chipRemove", { label })}
                    className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
