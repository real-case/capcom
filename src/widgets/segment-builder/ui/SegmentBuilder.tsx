"use client";

import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import {
  ATTRIBUTE_OPS,
  BEHAVIOR_OPS,
  MAX_PREDICATES,
  SEGMENT_EVENTS,
  type AttributeOp,
  type AttributePredicate,
  type BehaviorOp,
  type BehaviorPredicate,
  type SegmentRule,
  type TraitKey,
} from "@/entities/segment";

import { useSegmentDistribution, useSegmentSize } from "../api/use-segment";
import {
  DEFAULT_SEGMENT_QUERY,
  DIMENSIONS,
  RANGES,
  TRAIT_VALUES,
  segmentParsers,
  segmentQuerySchema,
  toSegmentDistributionArgs,
  toSegmentSizeArgs,
  type Dimension,
  type Range,
} from "../model/url-state";

import { SegmentDistribution } from "./SegmentDistribution";

/**
 * The segment builder (PR-7) — the widget that wires URL state to the two in-database
 * segment aggregations and the presentational distribution chart. The whole segment rule
 * (attribute + behavioural predicates), the distribution dimension, and the analysis range
 * are bound to the query string via nuqs (ADR 0027), so a segment is a shareable,
 * bookmarkable link; the hooks call the `SECURITY INVOKER` RPCs under the signed-in
 * member's RLS (ADR 0084/0013) and TanStack Query caches/polls the result (ADR 0025).
 * Every value control is a select/checkbox, so the builder only ever produces a
 * schema-valid rule (ADR 0017/0089). Loading / error / empty are threaded down to the
 * chart — it stays presentational (ADR 0086) and never fetches.
 */
export function SegmentBuilder({ projectId }: { projectId: string }) {
  const t = useTranslations("Segments");
  const [raw, setQuery] = useQueryStates(segmentParsers);

  // The Zod schema is the validation authority (ADR 0017): re-validate the nuqs-parsed
  // values, falling back to the defaults on a malformed URL.
  const query = segmentQuerySchema.catch(DEFAULT_SEGMENT_QUERY).parse(raw);
  const { rule } = query;

  // resolveWindow floors `to` to the UTC day, so these args are stable within a day and
  // the TanStack query keys don't thrash across re-renders.
  const now = new Date();
  const size = useSegmentSize(toSegmentSizeArgs(query, projectId, now));
  const distribution = useSegmentDistribution(
    toSegmentDistributionArgs(query, projectId, now),
  );

  // ── rule mutators — each writes the whole rule back to the URL ────────────────
  const updateRule = (patch: Partial<SegmentRule>) =>
    void setQuery({ rule: { ...rule, ...patch } });

  const setAttribute = (index: number, next: AttributePredicate) =>
    updateRule({
      attributes: rule.attributes.map((p, i) => (i === index ? next : p)),
    });
  const addAttribute = () => {
    if (rule.attributes.length >= MAX_PREDICATES) return;
    updateRule({
      attributes: [
        ...rule.attributes,
        { key: "plan", op: "eq", value: TRAIT_VALUES.plan[0]! },
      ],
    });
  };
  const removeAttribute = (index: number) =>
    updateRule({
      attributes: rule.attributes.filter((_, i) => i !== index),
    });

  const setBehavior = (index: number, next: BehaviorPredicate) =>
    updateRule({
      behaviors: rule.behaviors.map((p, i) => (i === index ? next : p)),
    });
  const addBehavior = () => {
    if (rule.behaviors.length >= MAX_PREDICATES) return;
    updateRule({
      behaviors: [
        ...rule.behaviors,
        { event: "purchase", op: "at_least", count: 1 },
      ],
    });
  };
  const removeBehavior = (index: number) =>
    updateRule({ behaviors: rule.behaviors.filter((_, i) => i !== index) });

  const isLoading = size.isPending || distribution.isPending;
  const isError = size.isError || distribution.isError;

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-wrap items-end gap-3">
        <legend className="sr-only">{t("controlsLegend")}</legend>
        <Field label={t("rangeLabel")}>
          <select
            className={selectClass}
            value={query.range}
            onChange={(e) => {
              const range = pick(RANGES, e.target.value);
              if (range) void setQuery({ range });
            }}
          >
            {RANGES.map((r) => (
              <option key={r} value={r}>
                {t(`range_${r}` as RangeKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("dimensionLabel")}>
          <select
            className={selectClass}
            value={query.dimension}
            onChange={(e) => {
              const dimension = pick(DIMENSIONS, e.target.value);
              if (dimension) void setQuery({ dimension });
            }}
          >
            {DIMENSIONS.map((d) => (
              <option key={d} value={d}>
                {t(`dimension_${d}` as DimensionKey)}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      {/* Attribute predicates (over profiles.traits). */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">
          {t("attributesLegend")}
        </legend>
        <ul className="flex flex-col gap-2">
          {rule.attributes.map((pred, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <select
                className={selectClass}
                aria-label={t("traitLabel", { n: i + 1 })}
                value={pred.key}
                onChange={(e) => {
                  const key = pick(DIMENSIONS, e.target.value);
                  if (key) setAttribute(i, withKey(pred, key));
                }}
              >
                {DIMENSIONS.map((k) => (
                  <option key={k} value={k}>
                    {t(`dimension_${k}` as DimensionKey)}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                aria-label={t("opLabel", { n: i + 1 })}
                value={pred.op}
                onChange={(e) => {
                  const op = pick(ATTRIBUTE_OPS, e.target.value);
                  if (op) setAttribute(i, withOp(pred, op));
                }}
              >
                {ATTRIBUTE_OPS.map((op) => (
                  <option key={op} value={op}>
                    {t(`attrOp_${op}` as AttrOpKey)}
                  </option>
                ))}
              </select>
              <AttributeValue
                pred={pred}
                groupLabel={t("valueLabel", { n: i + 1 })}
                onChange={(next) => setAttribute(i, next)}
              />
              <RemoveButton
                onClick={() => removeAttribute(i)}
                label={t("removeAttribute", { n: i + 1 })}
                text={t("remove")}
              />
            </li>
          ))}
        </ul>
        <div>
          <button
            type="button"
            className={addBtnClass}
            onClick={addAttribute}
            disabled={rule.attributes.length >= MAX_PREDICATES}
          >
            {t("addAttribute")}
          </button>
        </div>
      </fieldset>

      {/* Behavioural predicates (over the events stream). */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">
          {t("behaviorsLegend")}
        </legend>
        <ul className="flex flex-col gap-2">
          {rule.behaviors.map((pred, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <select
                className={selectClass}
                aria-label={t("eventLabel", { n: i + 1 })}
                value={pred.event}
                onChange={(e) => {
                  const event = pick(SEGMENT_EVENTS, e.target.value);
                  if (event) setBehavior(i, { ...pred, event });
                }}
              >
                {SEGMENT_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                aria-label={t("behaviorOpLabel", { n: i + 1 })}
                value={pred.op}
                onChange={(e) => {
                  const op = pick(BEHAVIOR_OPS, e.target.value);
                  if (op) setBehavior(i, { ...pred, op });
                }}
              >
                {BEHAVIOR_OPS.map((op) => (
                  <option key={op} value={op}>
                    {t(`behOp_${op}` as BehOpKey)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                className={`${selectClass} w-20 tabular-nums`}
                aria-label={t("countLabel", { n: i + 1 })}
                value={pred.count}
                onChange={(e) =>
                  setBehavior(i, { ...pred, count: clampCount(e.target.value) })
                }
              />
              <span className="text-xs text-muted-foreground">
                {t("timesSuffix")}
              </span>
              <RemoveButton
                onClick={() => removeBehavior(i)}
                label={t("removeBehavior", { n: i + 1 })}
                text={t("remove")}
              />
            </li>
          ))}
        </ul>
        <div>
          <button
            type="button"
            className={addBtnClass}
            onClick={addBehavior}
            disabled={rule.behaviors.length >= MAX_PREDICATES}
          >
            {t("addBehavior")}
          </button>
        </div>
      </fieldset>

      <section
        aria-label={t("distributionSectionLabel")}
        className="rounded-lg border border-border bg-card p-4"
      >
        <h2 className="mb-3 text-sm font-medium text-foreground">
          {t("distributionSectionLabel")}
        </h2>
        <SegmentDistribution
          data={distribution.data ?? []}
          size={size.data}
          isLoading={isLoading}
          isError={isError}
          label={t("distributionChartLabel")}
          usersLabel={t("usersLabel")}
          loadingLabel={t("loading")}
          errorLabel={t("error")}
          emptyLabel={t("noData")}
        />
      </section>
    </div>
  );
}

// ── attribute-predicate value control (single select, or checkboxes for `in`) ───
function AttributeValue({
  pred,
  groupLabel,
  onChange,
}: {
  pred: AttributePredicate;
  groupLabel: string;
  onChange: (next: AttributePredicate) => void;
}) {
  const values = TRAIT_VALUES[pred.key];
  if (pred.op === "in") {
    const selected = pred.value;
    const toggle = (v: string) => {
      const has = selected.includes(v);
      // Keep at least one value selected so the rule stays schema-valid (ADR 0089).
      if (has && selected.length <= 1) return;
      const next = has ? selected.filter((x) => x !== v) : [...selected, v];
      onChange({ key: pred.key, op: "in", value: next });
    };
    return (
      <span
        role="group"
        aria-label={groupLabel}
        className="flex flex-wrap items-center gap-x-3 gap-y-1"
      >
        {values.map((v) => (
          <label
            key={v}
            className="flex items-center gap-1 text-xs text-foreground"
          >
            <input
              type="checkbox"
              checked={selected.includes(v)}
              onChange={() => toggle(v)}
            />
            {v}
          </label>
        ))}
      </span>
    );
  }
  return (
    <select
      className={selectClass}
      aria-label={groupLabel}
      value={pred.value}
      onChange={(e) =>
        onChange({ key: pred.key, op: pred.op, value: e.target.value })
      }
    >
      {values.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

function RemoveButton({
  onClick,
  label,
  text,
}: {
  onClick: () => void;
  label: string;
  text: string;
}) {
  return (
    <button
      type="button"
      className={removeBtnClass}
      onClick={onClick}
      aria-label={label}
    >
      {text}
    </button>
  );
}

// ── predicate transforms that keep the discriminated union schema-valid ─────────

/** Re-key a predicate, resetting the value to the new trait's first option. */
function withKey(pred: AttributePredicate, key: TraitKey): AttributePredicate {
  const first = TRAIT_VALUES[key][0]!;
  return pred.op === "in"
    ? { key, op: "in", value: [first] }
    : { key, op: pred.op, value: first };
}

/** Switch a predicate's operator, converting the value between single and array form. */
function withOp(pred: AttributePredicate, op: AttributeOp): AttributePredicate {
  const fallback = TRAIT_VALUES[pred.key][0]!;
  if (op === "in") {
    const value = pred.op === "in" ? pred.value : [pred.value];
    return {
      key: pred.key,
      op: "in",
      value: value.length ? value : [fallback],
    };
  }
  const value = pred.op === "in" ? (pred.value[0] ?? fallback) : pred.value;
  return { key: pred.key, op, value };
}

/** Coerce a number-input value to a non-negative integer count (always schema-valid). */
function clampCount(raw: string): number {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const selectClass =
  "rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground";
const removeBtnClass =
  "rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground";
const addBtnClass =
  "rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

// Translation-key helpers: keep the dynamic `t(...)` calls inside the typed namespace.
type RangeKey = `range_${Range}`;
type DimensionKey = `dimension_${Dimension}`;
type AttrOpKey = `attrOp_${AttributeOp}`;
type BehOpKey = `behOp_${BehaviorOp}`;

/**
 * Narrow a raw `<select>` value to one of an allowed const tuple — runtime check, no `as`
 * cast: `find` returns the tuple's element type or undefined, so the URL state stays in
 * lockstep with the parser enums.
 */
function pick<const T extends readonly string[]>(
  allowed: T,
  value: string,
): T[number] | undefined {
  return allowed.find((option) => option === value);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
