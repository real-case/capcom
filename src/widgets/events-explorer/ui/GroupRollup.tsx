// No "use client": rendered only inside the client leaf (EventsExplorer), which owns
// the boundary (ADR 0002) — the same posture as EventsTable.
import { useLocale, useTranslations } from "next-intl";

import { useEventsFacets } from "../api/use-events";
import { type EventsFilter, type FacetDimension } from "../model/filter";
import { eventHue } from "../model/presentation";
import { toFacetsArgs } from "../model/url-state";

/**
 * GroupRollup — the group-by presentation (ADR 0098): one row per value of the chosen
 * dimension with its count under the active filter, served ENTIRELY by the
 * `fn_events_facets` RPC (ADR 0084) — no client-side tally. Bars are scaled to the
 * largest count (pure render geometry, the ADR 0086 chart posture; the fill is a
 * `var(--color-*)` token, ADR 0058). Activating a row applies that value as a facet
 * selection and returns to the row grid — the leaf owns that URL-state transition.
 */
export function GroupRollup({
  projectId,
  dimension,
  filter,
  onPick,
}: {
  projectId: string;
  dimension: FacetDimension;
  filter: EventsFilter;
  onPick: (dimension: FacetDimension, value: string) => void;
}) {
  const t = useTranslations("Events");
  const locale = useLocale();
  const facets = useEventsFacets(toFacetsArgs(projectId, filter, dimension));

  const rows = facets.data ?? [];
  const max = rows.reduce((best, row) => Math.max(best, row.count), 0);
  const format = new Intl.NumberFormat(locale);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("rollupTitle", { dimension: t(`facet_${dimension}`) })}
        </p>
        <p className="text-xs text-muted-foreground">{t("rollupHint")}</p>
      </div>
      {facets.isError ? (
        <p className="px-3 py-10 text-center text-sm text-muted-foreground">
          {t("error")}
        </p>
      ) : facets.isLoading ? (
        <p className="px-3 py-10 text-center text-sm text-muted-foreground">
          {t("loading")}
        </p>
      ) : rows.length === 0 ? (
        <p className="px-3 py-10 text-center text-sm text-muted-foreground">
          {t("rollupEmpty")}
        </p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li
              key={row.value}
              className="border-b border-border last:border-b-0"
            >
              <button
                type="button"
                onClick={() => onPick(dimension, row.value)}
                aria-label={t("rollupPick", { value: row.value })}
                className="grid w-full grid-cols-[minmax(6rem,12rem)_1fr_max-content] items-center gap-3 px-3 py-(--space-2) text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-[3px]"
                    style={{ background: eventHue(row.value) }}
                  />
                  <span className="truncate capitalize">{row.value}</span>
                </span>
                <svg
                  aria-hidden
                  className="h-1.5 w-full"
                  viewBox="0 0 100 4"
                  preserveAspectRatio="none"
                >
                  <rect
                    width={max > 0 ? (row.count / max) * 100 : 0}
                    height="4"
                    rx="1"
                    fill={eventHue(row.value)}
                  />
                </svg>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {format.format(row.count)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
