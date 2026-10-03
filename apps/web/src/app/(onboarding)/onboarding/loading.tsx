import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading(): React.JSX.Element {
  const t = useTranslations("onboarding.loading");
  return (
    <div role="status" aria-label={t("label")} className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
