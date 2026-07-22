"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

import { signUp, type AuthFailure } from "../api/actions";
import { signUpSchema, type SignUpValues } from "../model/schemas";

// Mission-control surface tokens (ADR 0081/0101) — same field skin as SignInForm.
const inputClass =
  "h-9 w-full rounded-md border border-border-hairline bg-surface-background px-3 py-1 text-sm text-text-primary shadow-sm transition-colors placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:outline-none disabled:opacity-50";

/**
 * Email/password sign-up (ADR 0016, 0020). Same canonical-schema contract as
 * sign-in: client-validate, then the `signUp` Server Action re-validates and
 * creates the account. A new user has no memberships, so the workspace home shows
 * its empty state until an admin invites them. Mission-control surface (ADR 0101).
 */
export function SignUpForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "" },
  });

  function messageFor(reason: AuthFailure): string {
    if (reason === "signup_failed") return t("errors.signupFailed");
    return t("errors.invalidInput");
  }

  function onSubmit(values: SignUpValues) {
    startTransition(async () => {
      const result = await signUp(values);
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
          autoComplete="new-password"
          className={inputClass}
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
        {errors.password ? (
          <p role="alert" className="text-sm text-status-critical-fg">
            {t("errors.passwordTooShort", { min: 8 })}
          </p>
        ) : null}
      </div>

      {errors.root ? (
        <p role="alert" className="text-sm text-status-critical-fg">
          {errors.root.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {t("signUp.submit")}
      </Button>

      <p className="text-sm text-text-secondary">
        {t("signUp.haveAccount")}{" "}
        <Link
          href="/sign-in"
          className="font-medium text-text-primary underline-offset-4 hover:underline"
        >
          {t("signUp.signInLink")}
        </Link>
      </p>
    </form>
  );
}
