"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * D5: `show` is `welcome === "1" && signupBonusGranted`, so a re-registered user with no bonus gets no credits toast.
 * `?welcome=1` is stripped in both cases; the guard keeps StrictMode's double effect from toasting twice.
 */
export function WelcomeToast({ show }: { show: boolean }): null {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (show) toast.success(t("welcomeToast"));
    router.replace("/onboarding");
  }, [show, t, router]);

  return null;
}
