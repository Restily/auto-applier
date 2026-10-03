"use client";

import { Check, Circle } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/** The live "At least 8 characters" line: gray dot until met, then a success check. Never colour alone. */
export function PasswordRequirement({ id, met }: { id: string; met: boolean }): React.JSX.Element {
  const t = useTranslations("auth.password");
  return (
    <p
      id={id}
      data-met={met}
      className="flex items-center gap-2 text-[length:var(--text-small-size)] leading-[var(--text-small-line)] text-muted-foreground"
    >
      {met ? (
        <Check aria-hidden="true" className="size-4 shrink-0 text-[var(--success)]" />
      ) : (
        <Circle aria-hidden="true" className="size-2 shrink-0 fill-current" />
      )}
      <span className={cn(met && "text-foreground")}>{t("requirement")}</span>
      {met ? <span className="sr-only">{t("requirementMet")}</span> : null}
    </p>
  );
}
