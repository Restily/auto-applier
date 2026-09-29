"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState, type FormEvent } from "react";

import { updatePasswordAction, type AuthFormState } from "@/lib/auth/actions";
import { resetPasswordSchema, toFieldErrors } from "@/lib/auth/schemas";
import type { ValidationKey } from "@/lib/validation/messages";

import { AuthCard } from "./auth-card";
import { FormAlert } from "./auth-notice";
import { ExpiredLinkPanel } from "./expired-link-panel";
import { PasswordField } from "./password-field";
import { PasswordRequirement } from "./password-requirement";
import { SubmitButton } from "./submit-button";

const REQUIREMENT_ID = "password-requirement";

/** `linkInvalid` is decided once on the server (bad `?error=` or no recovery session): then only the panel renders. */
export function ResetPasswordForm({ linkInvalid }: { linkInvalid: boolean }): React.JSX.Element {
  if (linkInvalid) return <ExpiredLinkPanel />;
  return <NewPasswordForm />;
}

function NewPasswordForm(): React.JSX.Element {
  const t = useTranslations("auth");
  const [password, setPassword] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<ValidationKey | undefined>();

  const [state, formAction, pending] = useActionState(
    async (prev: AuthFormState, formData: FormData): Promise<AuthFormState> => {
      const result = await updatePasswordAction(prev, formData);
      if (result.status === "error") {
        setAttempt((n) => n + 1);
        setError(result.fieldErrors?.password);
      }
      return result;
    },
    { status: "idle" },
  );

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    const parsed = resetPasswordSchema.safeParse({ password });
    if (parsed.success) return;
    event.preventDefault();
    setError(toFieldErrors<"password">(parsed.error).password);
    document.getElementById("password")?.focus();
  }

  const formError = state.status === "error" ? state.formError : undefined;

  return (
    <AuthCard heading={t("reset.heading")}>
      <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {formError ? (
          <FormAlert key={attempt} tone="danger">
            {formError === "rate_limited" ? t("errors.rateLimited") : t("errors.unknown")}
          </FormAlert>
        ) : null}
        <div className="flex flex-col gap-2">
          <PasswordField
            autoComplete="new-password"
            value={password}
            disabled={pending}
            errorKey={error}
            requirementId={REQUIREMENT_ID}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(undefined);
            }}
          />
          <PasswordRequirement id={REQUIREMENT_ID} met={password.length >= 8} />
        </div>
        <SubmitButton
          label={t("reset.submit")}
          pendingLabel={t("reset.submitting")}
          pending={pending}
          disabled={password.length === 0}
        />
      </form>
    </AuthCard>
  );
}
