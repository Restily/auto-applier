import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HealthStatus } from "@/components/health/health-status";
import { fetchApiHealth, toSystemHealthView } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("health");
  return { title: t("title") };
}

export default async function HealthPage() {
  const view = toSystemHealthView(await fetchApiHealth(), new Date());

  return <HealthStatus view={view} />;
}
