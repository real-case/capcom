// No "use client": rendered only inside the client leaf (EventsExplorer), which owns
// the boundary (ADR 0002) — the same posture as EventsTable.
import { useLocale, useTranslations } from "next-intl";

import { CategoryPill } from "@/components/ui/category-pill";
import { MonoData } from "@/components/ui/mono-data";
import { Panel } from "@/components/ui/panel";

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
    <Panel className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border-hairline px-3 py-2.5">
        <p className="text-xs font-medium text-text-secondary">
          {t("rollupTitle", { dimension: t(`facet_${dimension}`) })}
        </p>
        <p className="text-xs text-text-secondary">{t("rollupHint")}</p>
      </div>
      {facets.isError ? (
        <p className="px-3 py-10 text-center text-sm text-text-secondary">
          {t("error")}
        </p>
      ) : facets.isLoading ? (
        <p className="px-3 py-10 text-center text-sm text-text-secondary">
          {t("loading")}
        </p>
      ) : rows.length === 0 ? (
        <p className="px-3 py-10 text-center text-sm text-text-secondary">
          {t("rollupEmpty")}
        </p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li
              key={row.value}
              className="border-b border-border-hairline last:border-b-0"
            >
              <button
                type="button"
                onClick={() => onPick(dimension, row.value)}
                aria-label={t("rollupPick", { value: row.value })}
                className="grid w-full grid-cols-[minmax(6rem,12rem)_1fr_max-content] items-center gap-3 px-3 py-(--space-2) text-left transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
              >
                <CategoryPill hue={eventHue(row.value)} className="capitalize">
                  {row.value}
                </CategoryPill>
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
                <MonoData tone="secondary">{format.format(row.count)}</MonoData>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
