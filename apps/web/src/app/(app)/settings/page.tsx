import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AccountCard } from "@/components/settings/account-card";
import { DangerZoneCard } from "@/components/settings/danger-zone-card";
import { DataCard } from "@/components/settings/data-card";
import { LanguageCard } from "@/components/settings/language-card";
import { getShellData } from "@/lib/shell/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const [t, data] = await Promise.all([getTranslations("settings"), getShellData()]);
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <h1 className="text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold text-foreground">{t("title")}</h1>
      <AccountCard email={data.email} />
      <LanguageCard />
      <DataCard />
      <DangerZoneCard email={data.email} />
    </div>
  );
}
