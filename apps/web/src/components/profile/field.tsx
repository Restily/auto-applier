"use client";

import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import type { ValidationKey } from "@/lib/validation/messages";
import { cn } from "@/lib/utils";

export type ControlProps = {
  id: string;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
  "aria-describedby": string | undefined;
};

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: ValidationKey | undefined;
  hint?: string;
  className?: string;
  children: (control: ControlProps) => ReactNode;
};

/** MASTER §5 form field: label above, control, muted hint, and an inline error that replaces the hint. */
export function Field({ id, label, required, error, hint, className, children }: FieldProps): React.JSX.Element {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
        "aria-describedby": error ? errorId : hint ? hintId : undefined,
      })}
      <FieldError id={errorId} error={error} />
      {hint && !error ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FieldError({ id, error }: { id?: string; error?: ValidationKey | undefined }): React.JSX.Element | null {
  const tv = useTranslations("validation");
  if (!error) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-sm text-[color:var(--danger)]">
      <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
      <span>{tv(error)}</span>
    </p>
  );
}

const CONTROL =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

/** The kit has no Textarea primitive yet; same look as `Input`. */
export function Textarea({ className, ...props }: React.ComponentProps<"textarea">): React.JSX.Element {
  return <textarea className={cn(CONTROL, "min-h-24 resize-y", className)} {...props} />;
}
