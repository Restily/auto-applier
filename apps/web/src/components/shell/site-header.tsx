import { BriefcaseBusiness } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

import { isLocale } from "@/i18n/config";
import type { ShellData } from "@/lib/shell/data";
import { cn } from "@/lib/utils";

import { AccountMenu } from "./account-menu";
import { CreditBalance } from "./credit-balance";
import { LanguageSwitcher } from "./language-switcher";

type SiteHeaderProps = {
  /** Undefined before sign-in: only the logo and the language switcher show. */
  data?: ShellData;
  /** Rendered before the logo (the mobile navigation trigger). */
  leading?: ReactNode;
  /** The full shell shows the logo in the sidebar from `md` up. */
  logoMobileOnly?: boolean;
};

export function SiteHeader({ data, leading, logoMobileOnly = false }: SiteHeaderProps): React.JSX.Element {
  const t = useTranslations();
  const rawLocale = useLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "en";

  const logo = (
    <>
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
      >
        <BriefcaseBusiness className="size-4" />
      </span>
      <span className="sr-only text-[length:var(--text-h3-size)] font-semibold text-foreground sm:not-sr-only">
        {t("common.brand")}
      </span>
    </>
  );
  const logoClass = cn("flex min-h-11 items-center gap-2", logoMobileOnly && "md:hidden");

  return (
    <header className="flex h-[var(--shell-header-height)] items-center gap-2 border-b border-border bg-card px-4 md:px-6">
      {leading}
      {data ? (
        <Link href="/" aria-label={t("shell.logoLabel")} className={logoClass}>
          {logo}
        </Link>
      ) : (
        <div className={logoClass}>{logo}</div>
      )}
      <div className="ml-auto flex items-center gap-1">
        {data ? <CreditBalance balance={data.balance} /> : null}
        <LanguageSwitcher locale={locale} />
        {data ? <AccountMenu data={data} /> : null}
      </div>
    </header>
  );
}
