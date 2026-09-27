import type { Metadata } from "next";

import { HealthStatus } from "@/components/health/health-status";
import { fetchApiHealth, toSystemHealthView } from "@/lib/health";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "System health",
};

export default async function HealthPage() {
  const view = toSystemHealthView(await fetchApiHealth(), new Date());

  return <HealthStatus view={view} />;
}
