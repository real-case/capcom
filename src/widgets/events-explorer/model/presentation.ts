import type { AnalyticsEvent } from "@/entities/event";

/**
 * Presentational derivations for the events table (ADR 0097) — pure functions over an
 * already-fetched event row. NONE of these reduce across rows (that is the summary RPC's
 * job, ADR 0084); they only shape a single row's cells. Colors are emitted as literal
 * `var(--color-*)` tokens (ADR 0058/0081) so the usage gate sees a token, never a computed
 * color name or raw literal.
 */

/**
 * The categorical data-viz scale (ADR 0081): a colorblind-safe hue per event category,
 * cycled. Each entry is a literal token so the gate (ADR 0058) sees `var(--color-*)`.
 */
const EVENT_HUES = [
  "var(--color-viz-categorical-1)",
  "var(--color-viz-categorical-2)",
  "var(--color-viz-categorical-3)",
  "var(--color-viz-categorical-4)",
  "var(--color-viz-categorical-5)",
  "var(--color-viz-categorical-6)",
  "var(--color-viz-categorical-7)",
  "var(--color-viz-categorical-8)",
] as const;

/** A stable hue for an event name (same name → same color across pages/renders). */
export function eventHue(eventName: string): string {
  let hash = 0;
  for (let i = 0; i < eventName.length; i += 1) {
    hash = (hash * 31 + eventName.charCodeAt(i)) >>> 0;
  }
  return EVENT_HUES[hash % EVENT_HUES.length] ?? EVENT_HUES[0];
}

/**
 * The Badge variant for a plan trait. `pro`/`enterprise` are paid tiers (emphasized),
 * `free` is muted (outline). An unknown value falls back to outline. Variant names are
 * the Badge component's closed axis (ADR 0062), not raw color.
 */
export function planVariant(
  plan: string | undefined,
): "default" | "secondary" | "outline" {
  if (plan === "pro") return "default";
  if (plan === "enterprise") return "secondary";
  return "outline";
}

/**
 * Narrow a jsonb bag (the generated `Json` type) to a string-keyed record for property /
 * trait reads. The runtime `typeof` / array checks justify the single cast (ADR 0003: no
 * unchecked `as`) — a null / array / scalar bag reads as an empty record, so every caller
 * gets a safe object to index without repeating the guard.
 */
export function jsonRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Read a top-level string trait off the event's properties bag (plan/country/device). */
export function trait(event: AnalyticsEvent, key: string): string | undefined {
  const value = jsonRecord(event.properties)[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * The numeric event value (`properties.amount`), formatted as currency, or null when the
 * event carries no numeric amount. Currency comes from `properties.currency` (default USD).
 */
export function formatValue(
  event: AnalyticsEvent,
  locale: string,
): string | null {
  const props = jsonRecord(event.properties);
  const amount = props.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  // Only accept a well-formed ISO-4217-shaped code; an invalid `currency` would make
  // Intl.NumberFormat throw a RangeError, so fall back to USD.
  const raw = props.currency;
  const currency =
    typeof raw === "string" && /^[A-Za-z]{3}$/.test(raw) ? raw : "USD";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Property keys already shown as their own column / cell — excluded from the chips. */
const CHIP_EXCLUDE = new Set(["plan", "country", "device", "amount"]);

export type PropertyChip = { key: string; value: string };

/**
 * The property chips for the Properties column: the interesting non-column string/number
 * props, capped at `max` with the remainder surfaced as an overflow count.
 */
export function propertyChips(
  event: AnalyticsEvent,
  max = 2,
): { chips: PropertyChip[]; overflow: number } {
  const props = jsonRecord(event.properties);
  const entries: PropertyChip[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (CHIP_EXCLUDE.has(key)) continue;
    if (typeof value === "string" || typeof value === "number") {
      entries.push({ key, value: String(value) });
    }
  }
  return {
    chips: entries.slice(0, max),
    overflow: Math.max(0, entries.length - max),
  };
}

/**
 * The `Events` i18n keys for a relative-time bucket (a closed union so next-intl can
 * type-check the lookup at the call site).
 */
export type RelativeKey =
  | "relativeNow"
  | "relativeSeconds"
  | "relativeMinutes"
  | "relativeHours"
  | "relativeDays";

/**
 * Relative-time parts for a timestamp vs. now — returns the i18n message key and its `n`
 * argument, so the component formats via next-intl (ADR 0030) rather than baking English.
 */
export function relativeParts(
  tsIso: string,
  nowMs: number,
): { key: RelativeKey; n: number } {
  const deltaSec = Math.max(
    0,
    Math.round((nowMs - new Date(tsIso).getTime()) / 1000),
  );
  if (deltaSec < 5) return { key: "relativeNow", n: 0 };
  if (deltaSec < 60) return { key: "relativeSeconds", n: deltaSec };
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return { key: "relativeMinutes", n: min };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { key: "relativeHours", n: hr };
  return { key: "relativeDays", n: Math.floor(hr / 24) };
}

/** A short, stable id label (`u_9f3a…c21`-style) from a distinct_id. */
export function shortId(distinctId: string): string {
  if (distinctId.length <= 12) return distinctId;
  return `${distinctId.slice(0, 6)}…${distinctId.slice(-3)}`;
}
