"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { requestPasswordResetAction, type ForgotPasswordState } from "@/lib/auth/actions";
import { forgotPasswordSchema, toFieldErrors } from "@/lib/auth/schemas";
import type { ValidationKey } from "@/lib/validation/messages";

import { AuthCard } from "./auth-card";
import { AuthField } from "./auth-field";
import { SubmitButton } from "./submit-button";

export function ForgotPasswordForm(): React.JSX.Element {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<ValidationKey | undefined>();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> => {
      const result = await requestPasswordResetAction(prev, formData);
      setError(result.fieldErrors?.email);
      return result;
    },
    { status: "idle" },
  );

  const sent = state.status === "sent";
  useEffect(() => {
    if (sent) headingRef.current?.focus();
  }, [sent]);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (parsed.success) return;
    event.preventDefault();
    setError(toFieldErrors<"email">(parsed.error).email);
    document.getElementById("email")?.focus();
  }

  if (sent) {
    return (
      <AuthCard heading={t("forgot.successHeading")} headingRef={headingRef}>
        <div className="flex flex-col items-start gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--surface-sunken)]">
            <MailCheck aria-hidden="true" className="size-6 text-[var(--success)]" />
          </span>
          <p className="text-[length:var(--text-body-size)] leading-[var(--text-body-line)] text-muted-foreground">
            {t("forgot.successBody")}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-in">{t("forgot.backToSignIn")}</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard heading={t("forgot.heading")} headingRef={headingRef}>
      <p className="text-[length:var(--text-body-size)] leading-[var(--text-body-line)] text-muted-foreground">
        {t("forgot.body")}
      </p>
      <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <AuthField
          id="email"
          type="email"
          label={t("email.label")}
          autoComplete="email"
          value={email}
          disabled={pending}
          errorKey={error}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
          }}
        />
        <SubmitButton label={t("forgot.submit")} pendingLabel={t("forgot.submitting")} pending={pending} />
      </form>
      <Button asChild variant="link" className="self-center text-[length:var(--text-ui-size)]">
        <Link href="/sign-in">{t("forgot.backToSignIn")}</Link>
      </Button>
    </AuthCard>
  );
}
