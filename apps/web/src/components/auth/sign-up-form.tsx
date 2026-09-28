"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { signUpAction, type AuthFormState } from "@/lib/auth/actions";
import { signUpSchema, toFieldErrors } from "@/lib/auth/schemas";
import type { ValidationKey } from "@/lib/validation/messages";

import { AuthCard } from "./auth-card";
import { AuthField } from "./auth-field";
import { FormAlert } from "./auth-notice";
import { FooterLink } from "./footer-link";
import { GoogleSection } from "./google-button";
import { PasswordField } from "./password-field";
import { PasswordRequirement } from "./password-requirement";
import { SubmitButton } from "./submit-button";

type Field = "email" | "password";
const REQUIREMENT_ID = "password-requirement";

export function SignUpForm({ googleEnabled }: { googleEnabled: boolean }): React.JSX.Element {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, ValidationKey>>>({});

  const [state, formAction, pending] = useActionState(
    async (prev: AuthFormState, formData: FormData): Promise<AuthFormState> => {
      const result = await signUpAction(prev, formData);
      if (result.status === "error") {
        setErrors(result.fieldErrors ?? {});
        // The password is never echoed back after a failed attempt.
        setPassword("");
      }
      return result;
    },
    { status: "idle" },
  );

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    const parsed = signUpSchema.safeParse({ email, password });
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

  return (
    <AuthCard heading={t("signUp.heading")}>
      {googleEnabled ? <GoogleSection /> : null}
      <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {formError ? (
          <FormAlert
            key={state.status === "error" ? String(Date.now()) : "none"}
            tone="danger"
            actions={
              formError === "duplicate_email" ? (
                <>
                  <Button asChild variant="link" className="px-1">
                    <Link href="/sign-in">{t("signUp.duplicate.signIn")}</Link>
                  </Button>
                  <Button asChild variant="link" className="px-1">
                    <Link href="/sign-in/forgot-password">{t("signUp.duplicate.reset")}</Link>
                  </Button>
                </>
              ) : undefined
            }
          >
            {formError === "duplicate_email"
              ? t("signUp.duplicate.message")
              : formError === "rate_limited"
                ? t("errors.rateLimited")
                : formError === "weak_password"
                  ? t("password.requirement")
                  : t("errors.unknown")}
          </FormAlert>
        ) : null}
        <AuthField
          id="email"
          type="email"
          label={t("email.label")}
          autoComplete="email"
          value={email}
          disabled={pending}
          errorKey={errors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            clear("email");
          }}
          onBlur={() => {
            const r = signUpSchema.shape.email.safeParse(email);
            if (!r.success) setErrors((p) => ({ ...p, email: r.error.issues[0]?.message as ValidationKey }));
          }}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            autoComplete="new-password"
            value={password}
            disabled={pending}
            errorKey={errors.password}
            requirementId={REQUIREMENT_ID}
            onChange={(e) => {
              setPassword(e.target.value);
              clear("password");
            }}
          />
          <PasswordRequirement id={REQUIREMENT_ID} met={password.length >= 8} />
        </div>
        <SubmitButton
          label={t("signUp.submit")}
          pendingLabel={t("signUp.submitting")}
          pending={pending}
          disabled={email.length === 0 || password.length === 0}
        />
      </form>
      <FooterLink prompt={t("signUp.footerPrompt")} label={t("signUp.footerLink")} href="/sign-in" />
    </AuthCard>
  );
}
