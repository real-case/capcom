// No "use client": rendered only within the client table tree (EventsTable), which owns
// the client boundary (ADR 0002). A tiny component so the relative-time i18n lookup uses
// LITERAL message keys (next-intl type-checks each), switched off the closed RelativeKey.
import { useTranslations } from "next-intl";

import { relativeParts } from "../model/presentation";

export function RelativeTime({
  tsIso,
  nowMs,
}: {
  tsIso: string;
  nowMs: number;
}) {
  const t = useTranslations("Events");
  const { key, n } = relativeParts(tsIso, nowMs);
  switch (key) {
    case "relativeNow":
      return <>{t("relativeNow")}</>;
    case "relativeSeconds":
      return <>{t("relativeSeconds", { n })}</>;
    case "relativeMinutes":
      return <>{t("relativeMinutes", { n })}</>;
    case "relativeHours":
      return <>{t("relativeHours", { n })}</>;
    case "relativeDays":
      return <>{t("relativeDays", { n })}</>;
  }
}
