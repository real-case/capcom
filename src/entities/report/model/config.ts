import { z } from "zod";

import { Constants } from "@/lib/supabase/database.types";

import type { ReportKind } from "./types";

/**
 * The report-config contract (ADR 0090). A report's `config` is the originating
 * widget's URL-state (ADR 0027); the per-kind grammar is owned by that widget's Zod
 * schema (ADR 0017) and re-validated by the widget when the report is reopened. At
 * this persistence boundary the config is treated as an opaque JSON object — the same
 * posture the migration's `jsonb_typeof(config) = 'object'` CHECK takes — so the
 * `report` entity never imports the higher `widgets` layer (FSD downward-only,
 * ADR 0065/0066). This module owns only what persistence and reopening need: the kind
 * enum, the write envelope, the kind→route map, per-kind defaults, and the
 * config→URL-state serializer.
 */

/**
 * `report_kind` as a tuple/enum, sourced from the generated `Constants` so it stays in
 * lockstep with the migration through `gen:types` (ADR 0015) — never hand-listed.
 */
export const REPORT_KINDS = Constants.public.Enums.report_kind;
export const reportKindSchema = z.enum(REPORT_KINDS);

/**
 * A config is a JSON object. We assert only the shape here (object, not array/scalar),
 * mirroring the DB CHECK; the field-level grammar is the owning widget's authority.
 */
export const reportConfigSchema = z.record(z.string(), z.unknown());
export type ReportConfig = z.infer<typeof reportConfigSchema>;

/**
 * `[report]` — the write envelope the create/update Server Actions validate against
 * (ADR 0017/0090). `name` is bounded like every user string; `kind` is the closed enum;
 * `config` is a JSON object whose grammar the owning widget validated when it produced
 * the URL-state.
 */
export const reportInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: reportKindSchema,
  config: reportConfigSchema,
});
export type ReportInput = z.infer<typeof reportInputSchema>;

/** kind → the analysis route segment that renders it (the surface a report reopens on). */
export const reportKindRoute: Record<ReportKind, string> = {
  trends: "trends",
  funnel: "funnels",
  retention: "retention",
  segment: "segments",
  events: "events",
};

/**
 * Default config per kind. Mirrors each widget's `DEFAULT_*_QUERY` so a report can be
 * created on the dashboards surface without importing the widget layer (FSD
 * downward-only). The values are the same shapes the widgets' Zod schemas validate; if
 * they ever drift, the widget falls back to its own defaults on reopen, never errors.
 */
export const defaultConfigForKind: Record<ReportKind, ReportConfig> = {
  trends: {
    event: "page_view",
    range: "30d",
    interval: "day",
    breakdown: "none",
  },
  funnel: {
    steps: ["page_view", "sign_up", "feature_used", "purchase"],
    range: "90d",
    window: "30d",
  },
  retention: { range: "90d", period: "week" },
  segment: {
    rule: {
      match: "all",
      attributes: [{ key: "plan", op: "eq", value: "pro" }],
      behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
    },
    dimension: "country",
    range: "90d",
  },
  // A saved events VIEW (ADR 0098): the persistable slice of the explorer's URL-state —
  // filter/sort/pageSize/density/groupBy/hidden; `page` and `expanded` are navigation
  // state and are never part of a view.
  events: {
    filter: { search: "", events: [], plans: [], countries: [], devices: [] },
    sort: [{ id: "time", desc: true }],
    pageSize: 10,
    density: "comfortable",
    groupBy: "none",
    hidden: [],
  },
};

/**
 * Serialize a report's `config` to its surface's URL search params so "open" reopens
 * the saved analysis straight from its nuqs URL-state (ADR 0027/0090) — the existing
 * surface widget hydrates from these params, so no widget change is needed. Mirrors
 * each widget's nuqs encoding: plain string/enum fields pass through, funnel `steps`
 * join on `,`, and the segment `rule` is JSON-encoded (`parseAsJson`). A field absent
 * from the config is simply omitted; the widget then reads its own default.
 */
export function reportConfigToSearchParams(
  kind: ReportKind,
  config: ReportConfig,
): string {
  const params = new URLSearchParams();
  const setString = (key: string) => {
    const value = config[key];
    if (value !== undefined && value !== null) params.set(key, String(value));
  };

  switch (kind) {
    case "trends":
      ["event", "range", "interval", "breakdown"].forEach(setString);
      break;
    case "retention":
      ["range", "period"].forEach(setString);
      break;
    case "funnel": {
      const steps = config.steps;
      if (Array.isArray(steps))
        params.set("steps", steps.map(String).join(","));
      ["range", "window"].forEach(setString);
      break;
    }
    case "segment": {
      if (config.rule !== undefined && config.rule !== null) {
        params.set("rule", JSON.stringify(config.rule));
      }
      ["dimension", "range"].forEach(setString);
      break;
    }
    case "events": {
      // Mirrors the events widget's nuqs encoding (ADR 0098): filter/sort/hidden are
      // parseAsJson values, the scalars pass through. Transient fields (page,
      // expanded) are never in a config, so nothing is skipped here.
      for (const key of ["filter", "sort", "hidden"] as const) {
        const value = config[key];
        if (value !== undefined && value !== null) {
          params.set(key, JSON.stringify(value));
        }
      }
      ["pageSize", "density", "groupBy"].forEach(setString);
      break;
    }
  }
  return params.toString();
}
