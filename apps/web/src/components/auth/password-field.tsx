"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ValidationKey } from "@/lib/validation/messages";

import { FieldError, FieldLabel, INPUT_CLASS } from "./auth-field";

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, "id" | "name" | "type"> & {
  id?: string;
  errorKey?: ValidationKey;
  invalid?: boolean;
  /** id of the requirement line so it is read when the field takes focus. */
  requirementId?: string;
};

/** Password input with an in-field reveal toggle (its own tab stop right after the input). */
export function PasswordField({
  id = "password",
  errorKey,
  invalid,
  requirementId,
  ...inputProps
}: PasswordFieldProps): React.JSX.Element {
  const t = useTranslations("auth.password");
  const [revealed, setRevealed] = useState(false);
  const errorId = `${id}-error`;
  const describedBy = [requirementId, errorKey ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>{t("label")}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={revealed ? "text" : "password"}
          aria-required="true"
          aria-invalid={errorKey || invalid ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT_CLASS} pr-12`}
          {...inputProps}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={revealed ? t("hide") : t("show")}
          aria-pressed={revealed}
          onClick={() => setRevealed((v) => !v)}
          className="absolute top-0 right-0 text-muted-foreground"
        >
          {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </div>
      {errorKey ? <FieldError id={errorId} errorKey={errorKey} /> : null}
    </div>
  );
}
