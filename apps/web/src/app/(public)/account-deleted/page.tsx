import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AccountDeletedPanel } from "@/components/settings/account-deleted-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.deleted");
  return { title: t("heading") };
}

export default function AccountDeletedPage(): React.JSX.Element {
  return <AccountDeletedPanel />;
}
