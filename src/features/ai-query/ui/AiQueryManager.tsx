"use client";

import { useTranslateQuery } from "../api/use-translate";
import { AiQueryPanel } from "./AiQueryPanel";

/**
 * Container for the AI-query surface (ADR 0091): it owns the translation mutation
 * (the `"use server"` action over the `src/lib/ai` client) and wires it to the
 * presentational `AiQueryPanel`. The panel stays pure props; the server boundary —
 * and therefore the AI key — lives entirely behind the action (ADR 0018). The
 * action returns a discriminated result and never throws, so `mutation.data` is the
 * success-or-failure shape the panel renders directly.
 */
export function AiQueryManager({
  projectId,
  aiConfigured,
}: {
  projectId: string;
  aiConfigured: boolean;
}) {
  const translate = useTranslateQuery();

  return (
    <AiQueryPanel
      projectId={projectId}
      aiConfigured={aiConfigured}
      isPending={translate.isPending}
      result={translate.data ?? null}
      onSubmit={(prompt) => translate.mutate({ projectId, prompt })}
    />
  );
}
