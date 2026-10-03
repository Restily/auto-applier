"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

/** S-006 6c. No session: nothing to sign out of. */
export function AccountDeletedPanel(): React.JSX.Element {
  const t = useTranslations();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <AuthCard heading={t("account.deleted.heading")} headingRef={headingRef}>
      <div className="flex flex-col items-start gap-4">
        <CircleCheck aria-hidden="true" className="size-8 text-[var(--success)]" />
        <p className="text-[length:var(--text-body-size)] leading-[var(--text-body-line)] text-foreground">
          {t("account.deleted.body")}
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-up">{t("account.deleted.action")}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          {t("account.deleted.fingerprintNote")}{" "}
          <Link
            href="/privacy#after-deletion"
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("legal.privacy.linkLabel")}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
