"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { exchangeOAuthCodeAction } from "@/lib/auth/actions";

/** Returning from Google: exchange the one-time code, then move on. Renders only a polite status line. */
export function OAuthCallback({ code }: { code: string }): React.JSX.Element {
  const t = useTranslations("auth.callback");
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    // The code is single-use: guard against React strict mode running the effect twice.
    if (started.current) return;
    started.current = true;
    exchangeOAuthCodeAction(code)
      .then(({ redirectTo }) => router.replace(redirectTo))
      .catch(() => router.replace("/sign-in?notice=oauth_failed"));
  }, [code, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-[length:var(--text-body-size)] text-foreground">
      <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:hidden" />
      <p aria-live="polite">{t("signingIn")}</p>
    </div>
  );
}
