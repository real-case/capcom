import { useTranslations } from "next-intl";

import { TelemetryStat } from "@/components/ui/telemetry-stat";

/**
 * The app-shell telemetry footer (ADR 0099 widget-internal). A reference-dressing status strip
 * along the bottom of the console — Ingestion / RLS / freshness / events-per-minute — built
 * from the TelemetryStat primitive on the mission-control surface, so the chrome reads as one
 * instrument panel. STATIC: the shell fetches nothing (ADR 0083); these are illustrative
 * constants, not live data (live KPIs are the Overview's job, Phase D). Separated from the
 * content by a hairline top border (ADR 0058 token — a border utility, not the Hairline
 * component, to keep the composition graph unchanged). Labels via i18n (ADR 0030); the values
 * are dressing.
 */
const STATS = [
  { key: "ingestion", value: "active" },
  { key: "rls", value: "enforced" },
  { key: "freshness", value: "12s" },
  { key: "events", value: "1,240/min" },
] as const;

export function TelemetryFooter() {
  const t = useTranslations("AppShell.telemetry");

  return (
    <footer
      aria-label={t("label")}
      className="border-border-hairline bg-surface-background flex flex-wrap items-center gap-x-6 gap-y-2 border-t px-6 py-2.5"
    >
      {STATS.map(({ key, value }) => (
        <TelemetryStat key={key} label={t(key)} level="nominal">
          {value}
        </TelemetryStat>
      ))}
    </footer>
  );
}
