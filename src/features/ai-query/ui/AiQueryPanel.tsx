"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import type { TranslateActionResult } from "../api/actions";
import { specToDeepLink, summarizeSpec } from "../model/spec";

/**
 * Presentational AI-query panel (ADR 0091): a prompt box + example chips and the
 * interpreted-spec result. It is pure props — the container (`AiQueryManager`)
 * owns the translation mutation — so it is fully storybook/test-driven across the
 * offline-banner, pending, success, and failure states. A successful result shows
 * the interpreted spec in plain language plus an "Open analysis →" deep-link to the
 * existing surface (no chart is rendered here); a failure offers the example chips.
 * Token-only styling (ADR 0058): the offline notice uses the mission-control
 * `status-caution` tokens.
 */

const textareaClass =
  "min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export type AiQueryPanelProps = {
  projectId: string;
  /** Whether the live model path is available (the full AI_* contract, ADR 0075). */
  aiConfigured: boolean;
  isPending: boolean;
  /** The latest translation result, or null before the first submission. */
  result: TranslateActionResult | null;
  onSubmit: (prompt: string) => void;
};

const EXAMPLE_KEYS = ["example1", "example2", "example3", "example4"] as const;

export function AiQueryPanel({
  projectId,
  aiConfigured,
  isPending,
  result,
  onSubmit,
}: AiQueryPanelProps) {
  const t = useTranslations("AiQuery");
  const [prompt, setPrompt] = useState("");

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    setPrompt(value);
    onSubmit(trimmed);
  };

  const reasonMessage = (
    reason: "unrecognized" | "unauthorized" | "invalid",
  ) => {
    if (reason === "unauthorized") return t("errorUnauthorized");
    if (reason === "invalid") return t("errorInvalid");
    return t("errorUnrecognized");
  };

  return (
    <section className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      {!aiConfigured ? (
        <div
          role="note"
          className="rounded-md border border-status-caution-border bg-status-caution-bg px-3 py-2 text-sm text-status-caution-fg"
        >
          <span className="font-medium">{t("offlineTitle")}</span>{" "}
          {t("offlineBody")}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(prompt);
        }}
        noValidate
        className="flex flex-col gap-2"
      >
        <label
          htmlFor="ai-prompt"
          className="text-sm font-medium text-foreground"
        >
          {t("promptLabel")}
        </label>
        <textarea
          id="ai-prompt"
          className={textareaClass}
          placeholder={t("promptPlaceholder")}
          value={prompt}
          maxLength={500}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !prompt.trim()}
          >
            {isPending ? t("asking") : t("ask")}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">{t("tryLabel")}</span>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_KEYS.map((key) => {
            const example = t(key);
            return (
              <button
                key={key}
                type="button"
                disabled={isPending}
                onClick={() => submit(example)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {example}
              </button>
            );
          })}
        </div>
      </div>

      <div aria-live="polite" className="min-h-6">
        {isPending ? (
          <p className="text-sm text-muted-foreground">{t("interpreting")}</p>
        ) : result && result.ok ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              {t("resultHeading")}{" "}
              <span className="font-medium text-foreground">
                {t(`kind_${result.spec.kind}`)}
              </span>
            </p>
            <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              {summarizeSpec(result.spec).map((field) => (
                <div key={field.key} className="contents">
                  <dt className="text-muted-foreground">
                    {t(`field_${field.key}`)}
                  </dt>
                  <dd className="font-mono text-foreground">{field.value}</dd>
                </div>
              ))}
            </dl>
            {result.engine === "offline" && aiConfigured ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("offlineNote")}
              </p>
            ) : null}
            <Link
              href={specToDeepLink(result.spec, projectId)}
              className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("openAnalysis")} →
            </Link>
          </div>
        ) : result && !result.ok ? (
          <p role="alert" className="text-sm text-destructive">
            {reasonMessage(result.reason)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
