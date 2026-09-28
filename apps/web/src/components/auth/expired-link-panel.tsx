import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import { AuthCard } from "./auth-card";

/** Reset link is used up, expired or invalid: the form never renders (S-001 §4). */
export function ExpiredLinkPanel(): React.JSX.Element {
  const t = useTranslations("auth.expired");
  return (
    <AuthCard heading={t("heading")}>
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--danger-subtle)]">
          <AlertTriangle aria-hidden="true" className="size-6 text-[var(--danger)]" />
        </span>
        <p className="text-[length:var(--text-body-size)] leading-[var(--text-body-line)] text-muted-foreground">
          {t("body")}
        </p>
        <Button asChild className="w-full">
          <Link href="/sign-in/forgot-password">{t("action")}</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
