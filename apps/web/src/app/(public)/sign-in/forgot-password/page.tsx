import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("heading") };
}

export default function ForgotPasswordPage(): React.JSX.Element {
  return <ForgotPasswordForm />;
}
