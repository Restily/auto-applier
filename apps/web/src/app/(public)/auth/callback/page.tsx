import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { OAuthCallback } from "@/components/auth/oauth-callback";
import { callbackErrorRedirect } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.callback");
  return { title: t("signingIn") };
}

export default async function OAuthCallbackPage({ searchParams }: { searchParams: SearchParams }): Promise<React.JSX.Element> {
  const params = await searchParams;
  const failure = callbackErrorRedirect(first(params.error));
  if (failure) redirect(failure);
  const code = first(params.code);
  if (!code) redirect("/sign-in?notice=oauth_failed");
  return <OAuthCallback code={code} />;
}
