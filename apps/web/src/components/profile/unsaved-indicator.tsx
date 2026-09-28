"use client";

import { useTranslations } from "next-intl";

/** The live region always exists; only its text appears, so it is announced once when the form becomes dirty. */
export function UnsavedIndicator({ dirty }: { dirty: boolean }): React.JSX.Element {
  const t = useTranslations("profile");
  return (
    <span aria-live="polite" className="text-sm text-muted-foreground transition-opacity duration-[var(--duration-fast)]">
      {dirty ? t("unsaved") : null}
    </span>
  );
}
