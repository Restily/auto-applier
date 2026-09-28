"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ValidationKey } from "@/lib/validation/messages";
import { cn } from "@/lib/utils";

export const INPUT_CLASS = "h-11 text-[length:var(--text-ui-size)] md:text-[length:var(--text-ui-size)]";

/** MASTER §7 inline error: danger text with an icon, announced through role="alert". */
export function FieldError({ id, errorKey }: { id: string; errorKey: ValidationKey }): React.JSX.Element {
  const t = useTranslations("validation");
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-1.5 text-[length:var(--text-small-size)] leading-[var(--text-small-line)] text-[var(--danger)]"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{t(errorKey)}</span>
    </p>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Label htmlFor={htmlFor} className="text-[length:var(--text-ui-size)] leading-[var(--text-ui-line)]">
      <span>
        {children}
        <span aria-hidden="true" className="text-[var(--danger)]">
          {" *"}
        </span>
      </span>
    </Label>
  );
}

type AuthFieldProps = Omit<ComponentProps<typeof Input>, "id" | "name"> & {
  id: string;
  label: string;
  errorKey?: ValidationKey;
  /** Danger border without a message (invalid credentials colours both fields). */
  invalid?: boolean;
};

/** Label above the control, control, then the inline error that replaces helper text. */
export function AuthField({ id, label, errorKey, invalid, className, ...inputProps }: AuthFieldProps): React.JSX.Element {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={id}
        aria-required="true"
        aria-invalid={errorKey || invalid ? true : undefined}
        aria-describedby={errorKey ? errorId : undefined}
        className={cn(INPUT_CLASS, className)}
        {...inputProps}
      />
      {errorKey ? <FieldError id={errorId} errorKey={errorKey} /> : null}
    </div>
  );
}
