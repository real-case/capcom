"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

import { signOut } from "../api/actions";

/**
 * Sign out via the `signOut` Server Action (clears the session cookie), then
 * navigate to sign-in. `router.refresh()` re-runs the protected layout's guard so
 * the user lands outside the app shell (ADR 0016).
 */
export function SignOutButton() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const { ok } = await signOut();
          // A failed sign-out leaves the session intact; only navigate away when
          // it succeeded. `refresh` re-runs the guard either way.
          if (ok) router.push("/sign-in");
          router.refresh();
        })
      }
    >
      {t("signOut")}
    </Button>
  );
}
