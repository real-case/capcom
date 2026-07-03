"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

import { THEME_COOKIE, type Theme } from "../model/theme";

/**
 * Theme toggle (ADR 0092) — a client leaf. On click it flips the `.dark` class and the
 * `[data-theme]` attribute on `<html>` for instant feedback, and writes the persisted cookie
 * the pre-paint resolver reads on the next load (no client theme-provider). The sun/moon icon
 * is CSS-driven via the `dark:` variant, so the control holds no client state and cannot
 * hydration-mismatch. The accessible label is passed in already localized (ADR 0030) — the
 * server shell translates it — so this leaf needs no i18n context and renders standalone.
 */
export function ThemeToggle({
  label = "Toggle light or dark theme",
  className,
}: {
  /** Localized accessible label, supplied by the shell (ADR 0030). */
  label?: string;
  className?: string;
}) {
  function toggle() {
    const el = document.documentElement;
    const next: Theme = el.classList.contains("dark") ? "light" : "dark";
    el.classList.toggle("dark", next === "dark");
    el.setAttribute("data-theme", next);
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={className}
    >
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
    </Button>
  );
}
