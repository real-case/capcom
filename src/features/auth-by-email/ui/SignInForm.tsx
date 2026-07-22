"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

import { signIn, type AuthFailure } from "../api/actions";
import { signInSchema, type SignInValues } from "../model/schemas";

// Mission-control surface tokens (ADR 0081/0101): the field sits recessed on the
// auth Panel; semantic tokens only (ADR 0058), never the shadcn value layer.
const inputClass =
  "h-9 w-full rounded-md border border-border-hairline bg-surface-background px-3 py-1 text-sm text-text-primary shadow-sm transition-colors placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:outline-none disabled:opacity-50";

/**
 * Email/password sign-in (ADR 0016, 0020). Client-validates with the canonical
 * `signInSchema` via `zodResolver`, then calls the `signIn` Server Action, which
 * re-validates the same schema server-side. On success the client navigates
 * (locale-aware) to the workspace home; on failure RHF shows a translated,
 * generic message — never the raw provider error (ADR 0019). The secondary path
 * to the one-click `DemoSignIn`; skinned on the mission-control surface (ADR 0101).
 */
export function SignInForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  function messageFor(reason: AuthFailure): string {
    if (reason === "invalid_credentials") return t("errors.invalidCredentials");
    return t("errors.invalidInput");
  }

  function onSubmit(values: SignInValues) {
    startTransition(async () => {
      const result = await signIn(values);
      if (result.ok) {
        router.push("/p");
        router.refresh();
        return;
      }
      setError("root", { message: messageFor(result.reason) });
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-text-primary"
        >
          {t("email")}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputClass}
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p role="alert" className="text-sm text-status-critical-fg">
            {t("errors.emailInvalid")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-text-primary"
        >
          {t("password")}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
        {errors.password ? (
          <p role="alert" className="text-sm text-status-critical-fg">
            {t("errors.passwordRequired")}
          </p>
        ) : null}
      </div>

      {errors.root ? (
        <p role="alert" className="text-sm text-status-critical-fg">
          {errors.root.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {t("signIn.submit")}
      </Button>

      <p className="text-sm text-text-secondary">
        {t("signIn.noAccount")}{" "}
        <Link
          href="/sign-up"
          className="font-medium text-text-primary underline-offset-4 hover:underline"
        >
          {t("signIn.createOne")}
        </Link>
      </p>
    </form>
  );
}
