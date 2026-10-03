import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SignInForm } from "@/components/auth/sign-in-form";
import { parseSignInNotice } from "@/lib/auth/notices";
import { getAuthProviders } from "@/lib/auth/providers";
import { safeNextPath } from "@/lib/auth/redirects";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("heading") };
}

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }): Promise<React.JSX.Element> {
  const params = await searchParams;
  const { google } = await getAuthProviders();
  // The proxy sends `reason=session_expired`; actions and callbacks send `notice=`.
  const notice = parseSignInNotice(first(params.notice)) ?? parseSignInNotice(first(params.reason));
  const next = safeNextPath(first(params.next)) ?? undefined;
  return <SignInForm googleEnabled={google} notice={notice} next={next} />;
}
