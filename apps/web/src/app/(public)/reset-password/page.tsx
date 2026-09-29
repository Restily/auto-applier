import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("heading") };
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }): Promise<React.JSX.Element> {
  const { error } = await searchParams;
  // The form needs the recovery session /auth/confirm established; without it (or with ?error=) show the expired panel.
  const linkInvalid = error === "link_invalid" || (await getSessionUser()) === null;
  return <ResetPasswordForm linkInvalid={linkInvalid} />;
}
