// No "use client": rendered only within the client table tree (EventsTable owns the
// boundary, ADR 0002).
import { useTranslations } from "next-intl";

import type { AnalyticsEvent } from "@/entities/event";
import type { Profile } from "@/entities/profile";
import { cn } from "@/lib/utils";

import { formatValue, jsonRecord, shortId } from "../model/presentation";

import { RelativeTime } from "./RelativeTime";

/**
 * The expanded-row detail (ADR 0097): three token-styled cards — the event's raw
 * `properties`, the tracked user's profile, and the request context — plus the user's
 * recent-activity timeline. Purely presentational: it receives the already-fetched
 * profile/activity as props (the root owns the fetching, ADR 0025/0084) and renders only
 * real data, so absent fields (e.g. browser/os/ip, not in the seed) are simply omitted
 * rather than invented. Semantic tokens only (ADR 0058).
 */
export type EventDetailProps = {
  event: AnalyticsEvent;
  profile: Profile | null | undefined;
  activity: AnalyticsEvent[] | undefined;
  isLoading: boolean;
  locale: string;
  nowMs: number;
};

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <dl className="flex flex-col gap-1">{children}</dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <dt className="font-mono text-muted-foreground">{k}</dt>
      <dd className="truncate text-right font-mono text-foreground">{v}</dd>
    </div>
  );
}

export function EventDetail({
  event,
  profile,
  activity,
  isLoading,
  locale,
  nowMs,
}: EventDetailProps) {
  const t = useTranslations("Events");
  const props = jsonRecord(event.properties);
  const traitKeys = ["plan", "country", "device", "referrer"] as const;

  return (
    <div className="border-l-2 border-primary bg-muted/40 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-foreground">
          {t("detailTitle", { event: event.event_name })}
        </span>
        <span className="font-mono text-muted-foreground">
          {new Date(event.ts).toISOString()}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card title={t("card_properties")}>
          {Object.entries(props).map(([k, v]) => (
            <Row
              key={k}
              k={k}
              v={typeof v === "string" ? `"${v}"` : String(v)}
            />
          ))}
        </Card>

        <Card title={t("card_user", { id: shortId(event.distinct_id) })}>
          {isLoading ? (
            <span className="text-xs text-muted-foreground">
              {t("loading")}
            </span>
          ) : profile ? (
            <>
              {traitKeys.map((key) => {
                const value = jsonRecord(profile.traits)[key];
                return typeof value === "string" ? (
                  <Row key={key} k={t(`trait_${key}`)} v={value} />
                ) : null;
              })}
              <Row
                k={t("trait_firstSeen")}
                v={new Date(profile.first_seen_at).toLocaleDateString(locale)}
              />
              <Row
                k={t("trait_lastSeen")}
                v={new Date(profile.last_seen_at).toLocaleDateString(locale)}
              />
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("noProfile")}
            </span>
          )}
        </Card>

        <Card title={t("card_context")}>
          {(["device", "country", "referrer"] as const).map((key) => {
            const value = props[key];
            return typeof value === "string" ? (
              <Row key={key} k={key} v={value} />
            ) : null;
          })}
        </Card>
      </div>

      <div className="mt-3 rounded-lg border border-border bg-card p-3">
        <div className="mb-2 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
          {t("card_recent")}
        </div>
        <ol className="flex flex-col">
          {(activity ?? []).map((item, index) => {
            const value = formatValue(item, locale);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-2 py-1 text-xs",
                  index === 0 ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background:
                      index === 0
                        ? "var(--color-primary)"
                        : "var(--color-muted-foreground)",
                  }}
                />
                <span className="font-medium">{item.event_name}</span>
                {value ? <span className="font-mono">· {value}</span> : null}
                <span className="ml-auto font-mono text-muted-foreground">
                  <RelativeTime tsIso={item.ts} nowMs={nowMs} />
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
