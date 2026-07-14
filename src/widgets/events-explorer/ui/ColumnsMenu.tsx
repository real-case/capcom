// No "use client": rendered only inside the client leaf (EventsExplorer), which owns
// the boundary (ADR 0002) — the same posture as FacetFilter.
import { Columns3 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { HIDEABLE_COLUMNS, type HideableColumn } from "../model/url-state";

/**
 * ColumnsMenu — column show/hide (ADR 0098). Only the hideable set is offered (the
 * selection checkbox, event, and time columns are the row's spine); the hidden set is
 * nuqs URL-state at the leaf (ADR 0027), so it shares, bookmarks, and saves with the
 * view. Reordering/resizing stays deferred (ADR 0097 scope boundary).
 */
export function ColumnsMenu({
  hidden,
  onToggle,
}: {
  hidden: readonly HideableColumn[];
  onToggle: (column: HideableColumn) => void;
}) {
  const t = useTranslations("Events");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-text-secondary"
        >
          <Columns3 aria-hidden className="size-3.5" />
          {t("columns")}
          {hidden.length > 0 ? (
            <span className="tabular-nums text-[0.625rem]">
              −{hidden.length}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-border-hairline bg-surface-overlay"
      >
        <DropdownMenuLabel className="text-xs text-text-secondary">
          {t("columnsLabel")}
        </DropdownMenuLabel>
        {HIDEABLE_COLUMNS.map((column) => (
          <DropdownMenuCheckboxItem
            key={column}
            checked={!hidden.includes(column)}
            onCheckedChange={() => onToggle(column)}
            // Keep the menu open across toggles — hiding several columns is one task.
            onSelect={(event) => event.preventDefault()}
          >
            {t(`col_${column}`)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
