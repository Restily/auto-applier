import { redirect } from "next/navigation";

import { resolveLandingPath } from "@/lib/auth/landing";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage(): Promise<never> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-up");
  redirect(await resolveLandingPath());
}
