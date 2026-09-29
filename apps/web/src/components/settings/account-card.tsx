import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/sign-out";

import { SettingsCard } from "./settings-card";

export function AccountCard({ email }: { email: string }): React.JSX.Element {
  const t = useTranslations("settings.account");
  return (
    <SettingsCard title={t("title")}>
      <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">{t("email")}</dt>
        <dd className="font-medium break-all text-foreground">{email}</dd>
      </dl>
      <p className="text-[length:var(--text-body-size)] text-muted-foreground">
        {t.rich("resetPrompt", {
          link: (chunks) => (
            <Link href="/sign-in/forgot-password" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <form action={signOutAction} className="flex md:justify-end">
        <Button type="submit" variant="outline" className="w-full md:w-auto">
          {t("signOut")}
        </Button>
      </form>
    </SettingsCard>
  );
}
