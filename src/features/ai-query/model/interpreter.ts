import type {
  AttributePredicate,
  BehaviorPredicate,
  TraitKey,
} from "@/entities/segment";

import { AI_EVENTS, FUNNEL_MAX_STEPS, type AiQuerySpec } from "./spec";

/**
 * The deterministic offline interpreter (ADR 0091): a bounded, rule-based keyword
 * mapper that translates a free-text prompt into the SAME `[ai-query]` spec for a
 * curated set of demo intents. It is the no-key fallback so the surface works (and
 * the deployed demo stays alive) without `AI_API_KEY`, and the deterministic
 * happy-path the tests assert; the live model is the real translator. It is
 * explicitly NOT an NLU engine — an unrecognized prompt returns `null` (the panel
 * then offers example chips). Every returned branch is a schema-valid spec by
 * construction (defaults fill any undetected field), so its output never falls back
 * to a widget default on reopen.
 */

type EventName = (typeof AI_EVENTS)[number];
type RawRange = "7d" | "30d" | "90d" | "180d";

// Synonyms → canonical event (the seed's five events). Ordered; first match wins.
const EVENT_SYNONYMS: { event: EventName; re: RegExp }[] = [
  {
    event: "sign_up",
    re: /\b(sign[\s-]?ups?|signups?|registrations?|registered|register|new users?)\b/,
  },
  {
    event: "purchase",
    re: /\b(purchases?|purchased|revenue|orders?|sales?|checkouts?|bought|paid|payments?)\b/,
  },
  {
    event: "feature_used",
    re: /\b(feature[\s-]?use(d|s)?|feature usage|activations?|activated|engagement)\b/,
  },
  { event: "search", re: /\b(searche?s?|searched|queries)\b/ },
  {
    event: "page_view",
    re: /\b(page[\s-]?views?|pageviews?|visits?|sessions?|traffic|landing|views?)\b/,
  },
];

function detectEvent(text: string): EventName | undefined {
  for (const { event, re } of EVENT_SYNONYMS) if (re.test(text)) return event;
  return undefined;
}

/** Events in order of first appearance — the funnel step sequence. */
function detectEventSequence(text: string): EventName[] {
  const hits: { event: EventName; idx: number }[] = [];
  for (const { event, re } of EVENT_SYNONYMS) {
    const m = re.exec(text);
    if (m) hits.push({ event, idx: m.index });
  }
  return hits.sort((a, b) => a.idx - b.idx).map((h) => h.event);
}

function detectRange(text: string): RawRange | undefined {
  if (/\b(180\s*days?|6\s*months?|half[\s-]?year)\b/.test(text)) return "180d";
  if (
    /\b(90\s*days?|3\s*months?|last quarter|past quarter|quarter)\b/.test(text)
  )
    return "90d";
  if (/\b(30\s*days?|last month|past month)\b/.test(text)) return "30d";
  if (/\b(7\s*days?|last week|past week|this week)\b/.test(text)) return "7d";
  return undefined;
}

function detectInterval(
  text: string,
): "hour" | "day" | "week" | "month" | undefined {
  if (/\b(hourly|per hour|by hour|hour)\b/.test(text)) return "hour";
  if (/\b(daily|per day|by day|each day)\b/.test(text)) return "day";
  if (/\b(weekly|per week|by week|each week)\b/.test(text)) return "week";
  if (/\b(monthly|per month|by month|each month)\b/.test(text)) return "month";
  return undefined;
}

function detectBreakdown(
  text: string,
): "none" | "device" | "plan" | "country" | "path" | "referrer" | undefined {
  if (
    /\bby\s+(channel|source|referr?er|utm)\b/.test(text) ||
    /\bchannels?\b/.test(text)
  )
    return "referrer";
  if (
    /\bby\s+(country|geo|region|location)\b/.test(text) ||
    /\bcountr(y|ies)\b/.test(text)
  )
    return "country";
  if (/\bby\s+(device|platform)\b/.test(text) || /\bdevices?\b/.test(text))
    return "device";
  if (/\bby\s+(plan|tier|subscription)\b/.test(text) || /\bplans?\b/.test(text))
    return "plan";
  if (/\bby\s+(page|path|url|route)\b/.test(text)) return "path";
  return undefined;
}

function detectPeriod(text: string): "week" | "month" | undefined {
  if (/\b(month|monthly)\b/.test(text)) return "month";
  if (/\b(week|weekly)\b/.test(text)) return "week";
  return undefined;
}

function detectDimension(text: string): TraitKey | undefined {
  if (
    /\bby\s+(country|geo|region)\b/.test(text) ||
    /\bcountr(y|ies)\b/.test(text)
  )
    return "country";
  if (/\bby\s+(plan|tier)\b/.test(text) || /\bplans?\b/.test(text))
    return "plan";
  if (/\bby\s+(device|platform)\b/.test(text) || /\bdevices?\b/.test(text))
    return "device";
  if (
    /\bby\s+(channel|source|referr)\w*\b/.test(text) ||
    /\bchannels?\b/.test(text)
  )
    return "referrer";
  return undefined;
}

// Range clamps — keep the detected bucket inside each kind's allowed set so the
// interpreter never emits an out-of-vocabulary range (the mirrored enums in spec.ts).
function clampTrendsRange(r?: RawRange): "7d" | "30d" | "90d" {
  if (r === undefined) return "30d";
  if (r === "180d") return "90d";
  return r;
}
function clampFunnelRange(r?: RawRange): "7d" | "30d" | "90d" {
  if (r === undefined) return "90d";
  if (r === "180d") return "90d";
  return r;
}
function clampRetentionRange(r?: RawRange): "30d" | "90d" | "180d" {
  if (r === undefined) return "90d";
  if (r === "7d") return "30d";
  return r;
}

const KIND_RE = {
  funnel: /\b(funnels?|conversions?|drop[\s-]?offs?|step[\s-]?through)\b/,
  retention:
    /\b(retention|cohorts?|come\s?back|came\s?back|returning|repeat|stickiness)\b/,
  segment: /\b(segments?|users? who|audience|sub[\s-]?population|filter to)\b/,
};

// A prompt must show SOME analytics intent to be interpreted; otherwise null
// (the honest "couldn't interpret that" path that offers example chips).
const INTENT_RE =
  /\b(trends?|over time|chart|graph|show|count|how many|number of|breakdown|by\s+\w+|funnels?|conversions?|retention|cohorts?|segments?|users?|sign[\s-]?ups?|registrations?|purchases?|revenue|page[\s-]?views?|visits?|searche?s?|feature|active|daily|weekly|monthly)\b/;

function buildSegmentConfig(
  text: string,
): Extract<AiQuerySpec, { kind: "segment" }>["config"] {
  const attributes: AttributePredicate[] = [];
  const behaviors: BehaviorPredicate[] = [];

  const plan = /\b(free|pro|enterprise)\b/.exec(text)?.[1];
  if (plan === "free" || plan === "pro" || plan === "enterprise") {
    attributes.push({ key: "plan", op: "eq", value: plan });
  }

  if (/\bnever\s+(purchas\w*|bought|paid)\b/.test(text)) {
    behaviors.push({ event: "purchase", op: "at_most", count: 0 });
  } else if (
    /\b(purchas\w*|bought|paid|revenue|customers?|buyers?)\b/.test(text)
  ) {
    behaviors.push({ event: "purchase", op: "at_least", count: 1 });
  } else if (/\b(sign[\s-]?up\w*|registered)\b/.test(text)) {
    behaviors.push({ event: "sign_up", op: "at_least", count: 1 });
  }

  // A meaningful, schema-valid default when nothing concrete was detected.
  if (attributes.length === 0 && behaviors.length === 0) {
    attributes.push({ key: "plan", op: "eq", value: "pro" });
    behaviors.push({ event: "purchase", op: "at_least", count: 1 });
  }

  return {
    rule: { match: "all", attributes, behaviors },
    dimension: detectDimension(text) ?? "country",
    range: clampRetentionRange(detectRange(text)),
  };
}

export function interpretPrompt(prompt: string): AiQuerySpec | null {
  const text = prompt.toLowerCase();
  if (!INTENT_RE.test(text)) return null;

  if (KIND_RE.funnel.test(text)) {
    const seq = detectEventSequence(text);
    const steps =
      seq.length >= 2
        ? seq.slice(0, FUNNEL_MAX_STEPS)
        : (["page_view", "sign_up", "feature_used", "purchase"] as EventName[]);
    return {
      kind: "funnel",
      config: {
        steps,
        range: clampFunnelRange(detectRange(text)),
        window: "30d",
      },
    };
  }

  if (KIND_RE.retention.test(text)) {
    return {
      kind: "retention",
      config: {
        range: clampRetentionRange(detectRange(text)),
        period: detectPeriod(text) ?? "week",
      },
    };
  }

  if (KIND_RE.segment.test(text)) {
    return { kind: "segment", config: buildSegmentConfig(text) };
  }

  return {
    kind: "trends",
    config: {
      event: detectEvent(text) ?? "page_view",
      range: clampTrendsRange(detectRange(text)),
      interval: detectInterval(text) ?? "day",
      breakdown: detectBreakdown(text) ?? "none",
    },
  };
}
