"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useRouter } from "@/i18n/navigation";

import { signInAsDemo } from "../api/actions";
import type { DemoAccountKey } from "../model/demo";

import { DemoSignIn } from "./DemoSignIn";

/**
 * Container for the one-click demo sign-in (ADR 0101). Owns the `signInAsDemo` Server Action —
 * so the server-only credential chain stays behind this boundary (the `AiQueryManager` split) —
 * plus the pending/error state and the locale-aware navigation to the workspace home. The
 * presentational `DemoSignIn` stays pure props and is storyable. The client only ever sends a
 * demo-account KEY (the closed enum is the injection boundary); no credential crosses to it.
 */
export function DemoSignInManager() {
  const t = useTranslations("Auth.demo");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<DemoAccountKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePick(key: DemoAccountKey) {
    setError(null);
    setPendingKey(key);
    startTransition(async () => {
      const result = await signInAsDemo(key);
      if (result.ok) {
        router.push("/p");
        router.refresh();
        return;
      }
      // Generic message only (ADR 0019) — both failure reasons read the same.
      setPendingKey(null);
      setError(t("errors.failed"));
    });
  }

  return (
    <DemoSignIn onPick={handlePick} pendingKey={pendingKey} error={error} />
  );
}
