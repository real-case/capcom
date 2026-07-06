"use client";

import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import { Combobox } from "@/components/ui/combobox";
import { ComboField } from "@/shared/ui";

import { useFunnel } from "../api/use-funnel";
import {
  DEFAULT_FUNNEL_QUERY,
  FUNNEL_EVENTS,
  MAX_STEPS,
  MIN_STEPS,
  RANGES,
  WINDOWS,
  funnelParsers,
  funnelQuerySchema,
  toFunnelArgs,
  type Range,
  type Window,
} from "../model/url-state";

import { FunnelChart } from "./FunnelChart";

/**
 * The funnel builder (PR-5) — the widget that wires URL state to the in-database
 * `fn_funnel` aggregation and the presentational chart segment. The ordered step list,
 * entry range, and conversion window are bound to the query string via nuqs (ADR 0027),
 * so a funnel is a shareable, bookmarkable link; the hook calls the `SECURITY INVOKER`
 * RPC under the signed-in member's RLS (ADR 0084/0013) and TanStack Query caches/polls
 * the result (ADR 0025). Loading / error / empty are threaded down to the chart as
 * props — the chart stays presentational (ADR 0086) and never fetches.
 */
export function FunnelBuilder({ projectId }: { projectId: string }) {
  const t = useTranslations("Funnels");
  const tc = useTranslations("Controls");
  const [raw, setQuery] = useQueryStates(funnelParsers);

  // The Zod schema is the validation authority (ADR 0017): run the nuqs-parsed values
  // through it before deriving RPC args. nuqs constrains the enum params; this also
  // bounds the step list (count + per-entry length), falling back to the defaults on a
  // malformed URL.
  const query = funnelQuerySchema.catch(DEFAULT_FUNNEL_QUERY).parse(raw);

  // resolveWindow floors `to` to the UTC day, so these args are stable within a day and
  // the TanStack query key doesn't thrash across re-renders.
  const now = new Date();
  const funnel = useFunnel(toFunnelArgs(query, projectId, now));

  const setStep = (index: number, value: string) =>
    void setQuery({
      steps: query.steps.map((s, i) => (i === index ? value : s)),
    });

  const addStep = () => {
    if (query.steps.length >= MAX_STEPS) return;
    // Append the first canonical event not already in the funnel, else repeat the last.
    const next =
      FUNNEL_EVENTS.find((e) => !query.steps.includes(e)) ??
      query.steps[query.steps.length - 1]!;
    void setQuery({ steps: [...query.steps, next] });
  };

  const removeStep = (index: number) => {
    if (query.steps.length <= MIN_STEPS) return;
    void setQuery({ steps: query.steps.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-wrap items-end gap-3">
        <legend className="sr-only">{t("controlsLegend")}</legend>

        <ComboField
          label={t("rangeLabel")}
          value={query.range}
          options={RANGES.map((r) => ({
            value: r,
            label: t(`range_${r}` as RangeKey),
          }))}
          onValueChange={(value) => {
            const range = pick(RANGES, value);
            if (range) void setQuery({ range });
          }}
          searchPlaceholder={tc("search")}
          emptyText={tc("noResults")}
        />

        <ComboField
          label={t("windowLabel")}
          value={query.window}
          options={WINDOWS.map((w) => ({
            value: w,
            label: t(`window_${w}` as WindowKey),
          }))}
          onValueChange={(value) => {
            const window = pick(WINDOWS, value);
            if (window) void setQuery({ window });
          }}
          searchPlaceholder={tc("search")}
          emptyText={tc("noResults")}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">
          {t("stepsLegend")}
        </legend>
        <ol className="flex flex-col gap-2">
          {query.steps.map((step, i) => {
            // Keep the current value selectable even if it isn't in the curated set.
            const options = Array.from(new Set([step, ...FUNNEL_EVENTS]));
            return (
              <li key={i} className="flex items-center gap-2">
                <span className="w-14 text-xs font-medium text-muted-foreground tabular-nums">
                  {t("stepLabel", { n: i + 1 })}
                </span>
                <Combobox
                  aria-label={t("stepEventLabel", { n: i + 1 })}
                  className="w-52"
                  value={step}
                  options={options.map((name) => ({
                    value: name,
                    label: name,
                  }))}
                  onValueChange={(value) => {
                    if (value) setStep(i, value);
                  }}
                  searchPlaceholder={tc("search")}
                  emptyText={tc("noResults")}
                />
                <button
                  type="button"
                  className={removeBtnClass}
                  onClick={() => removeStep(i)}
                  disabled={query.steps.length <= MIN_STEPS}
                  aria-label={t("removeStep", { n: i + 1 })}
                >
                  {t("remove")}
                </button>
              </li>
            );
          })}
        </ol>
        <div>
          <button
            type="button"
            className={addBtnClass}
            onClick={addStep}
            disabled={query.steps.length >= MAX_STEPS}
          >
            {t("addStep")}
          </button>
        </div>
      </fieldset>

      <section
        aria-label={t("funnelSectionLabel")}
        className="rounded-lg border border-border bg-card p-4"
      >
        <h2 className="mb-3 text-sm font-medium text-foreground">
          {t("funnelSectionLabel")}
        </h2>
        <FunnelChart
          data={funnel.data ?? []}
          isLoading={funnel.isPending}
          isError={funnel.isError}
          label={t("funnelChartLabel")}
          loadingLabel={t("loading")}
          errorLabel={t("error")}
          emptyLabel={t("noData")}
        />
      </section>
    </div>
  );
}

const removeBtnClass =
  "rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";
const addBtnClass =
  "rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

// Translation-key helpers: keep the dynamic `t(...)` calls inside the typed namespace.
type RangeKey = `range_${Range}`;
type WindowKey = `window_${Window}`;

/**
 * Narrow a raw combobox value to one of an allowed const tuple — runtime check, no
 * `as` cast: `find` returns the tuple's element type or undefined, so the URL state
 * stays in lockstep with the parser enums.
 */
function pick<const T extends readonly string[]>(
  allowed: T,
  value: string,
): T[number] | undefined {
  return allowed.find((option) => option === value);
}

// The labelled Combobox lives in `@/shared/ui` (`ComboField`), shared across the analytics
// widgets — imported above. The per-step control uses `Combobox` directly.
