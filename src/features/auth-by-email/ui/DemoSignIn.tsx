"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { DEMO_ACCOUNTS, type DemoAccountKey } from "../model/demo";

/**
 * Presentational one-click demo sign-in (ADR 0101). Renders the closed set of seeded demo
 * identities as "Continue as …" cards on the mission-control surface (0081); a click calls
 * `onPick(key)` with only the account KEY — the container owns the Server Action, navigation,
 * and pending/error state (the `AiQueryPanel`/`AiQueryManager` split, so this stays free of the
 * server-only chain and is storyable). The role ladder (owner → analyst → viewer) lets a visitor
 * watch RBAC change what they can see and do. Semantic tokens only (0058).
 */
export function DemoSignIn({
  onPick,
  pendingKey,
  error,
}: {
  onPick: (key: DemoAccountKey) => void;
  pendingKey: DemoAccountKey | null;
  error: string | null;
}) {
  const t = useTranslations("Auth.demo");
  const tRoles = useTranslations("Roles");
  const busy = pendingKey !== null;

  const roleHint: Record<"owner" | "analyst" | "viewer", string> = {
    owner: t("roleHint.owner"),
    analyst: t("roleHint.analyst"),
    viewer: t("roleHint.viewer"),
  };

  return (
    <div className="flex flex-col gap-2">
      {DEMO_ACCOUNTS.map((account) => {
        const isThisPending = pendingKey === account.key;
        return (
          <button
            key={account.key}
            type="button"
            onClick={() => onPick(account.key)}
            disabled={busy}
            aria-busy={isThisPending}
            className="group flex items-center justify-between gap-3 rounded-md border border-border-hairline bg-surface-elevated px-4 py-3 text-left transition-colors hover:bg-surface-overlay focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium text-text-primary">
                {t("continueAs", { name: account.name })}
              </span>
              <span className="truncate text-xs text-text-secondary">
                {roleHint[account.roleKey]}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-border-hairline bg-surface-panel px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                {tRoles(account.roleKey)}
              </span>
              {isThisPending ? (
                <Loader2
                  className="size-4 text-text-secondary motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ArrowRight
                  className="size-4 text-text-tertiary transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              )}
            </span>
          </button>
        );
      })}
      {error ? (
        <p role="alert" className="text-sm text-status-critical-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
