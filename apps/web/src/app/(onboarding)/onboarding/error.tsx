"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function OnboardingError({ reset }: { error: Error; reset: () => void }): React.JSX.Element {
  const t = useTranslations();
  return (
    <div role="alert" className="mx-auto flex w-full max-w-[640px] flex-col items-start gap-4">
      <p>{t("onboarding.error.body")}</p>
      <Button type="button" onClick={reset}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
