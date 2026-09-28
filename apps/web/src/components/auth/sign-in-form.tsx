"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { signInAction, type AuthFormState } from "@/lib/auth/actions";
import { signInSchema, toFieldErrors } from "@/lib/auth/schemas";
import type { ValidationKey } from "@/lib/validation/messages";

import { AuthCard } from "./auth-card";
import { AuthField } from "./auth-field";
import { AuthNotice, FormAlert, type SignInNotice } from "./auth-notice";
import { FooterLink } from "./footer-link";
import { GoogleSection } from "./google-button";
import { PasswordField } from "./password-field";
import { SubmitButton } from "./submit-button";

type Field = "email" | "password";

export function SignInForm({
  googleEnabled,
  notice,
  next,
}: {
  googleEnabled: boolean;
  notice?: SignInNotice;
  /** Already validated by the page (safeNextPath); the action validates again. */
  next?: string;
}): React.JSX.Element {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, ValidationKey>>>({});

  const [state, formAction, pending] = useActionState(
    async (prev: AuthFormState, formData: FormData): Promise<AuthFormState> => {
      const result = await signInAction(prev, formData);
      if (result.status === "error") {
        setErrors(result.fieldErrors ?? {});
        setPassword("");
      }
      return result;
    },
    { status: "idle" },
  );

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    const parsed = signInSchema.safeParse({ email, password });
    if (parsed.success) return;
    event.preventDefault();
    const found = toFieldErrors<Field>(parsed.error);
    setErrors(found);
    document.getElementById(found.email ? "email" : "password")?.focus();
  }

  function clear(field: Field): void {
    setErrors((prev) => (field in prev ? { ...prev, [field]: undefined } : prev));
  }

  const formError = state.status === "error" ? state.formError : undefined;
  // Invalid credentials colours both fields together and never on blur (would leak which half was wrong).
  const bothInvalid = formError === "invalid_credentials";

  return (
    <AuthCard heading={t("signIn.heading")}>
      <AuthNotice notice={notice} />
      {googleEnabled ? <GoogleSection /> : null}
      <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {formError ? (
          <FormAlert key={String(state.status === "error" && state)} tone="danger">
            {formError === "rate_limited"
              ? t("errors.rateLimited")
              : formError === "invalid_credentials"
                ? t("signIn.invalidCredentials")
                : t("errors.unknown")}
          </FormAlert>
        ) : null}
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <AuthField
          id="email"
          type="email"
          label={t("email.label")}
          autoComplete="email"
          value={email}
          disabled={pending}
          invalid={bothInvalid}
          errorKey={errors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            clear("email");
          }}
        />
        <PasswordField
          autoComplete="current-password"
          value={password}
          disabled={pending}
          invalid={bothInvalid}
          errorKey={errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            clear("password");
          }}
        />
        <SubmitButton label={t("signIn.submit")} pendingLabel={t("signIn.submitting")} pending={pending} />
      </form>
      <div className="flex flex-col items-center gap-1">
        <Button asChild variant="link" className="text-[length:var(--text-ui-size)]">
          <Link href="/sign-in/forgot-password">{t("signIn.forgot")}</Link>
        </Button>
        <FooterLink prompt={t("signIn.footerPrompt")} label={t("signIn.footerLink")} href="/sign-up" />
      </div>
    </AuthCard>
  );
}
