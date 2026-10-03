import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PrivacyContent } from "@/components/settings/privacy-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy");
  return { title: t("title") };
}

export default function PrivacyPage(): React.JSX.Element {
  return <PrivacyContent />;
}
