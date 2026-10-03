import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { getAuthProviders } from "@/lib/auth/providers";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signUp");
  return { title: t("heading") };
}

export default async function SignUpPage(): Promise<React.JSX.Element> {
  const { google } = await getAuthProviders();
  return <SignUpForm googleEnabled={google} />;
}
