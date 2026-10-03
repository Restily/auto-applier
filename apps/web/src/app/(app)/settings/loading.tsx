import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading(): React.JSX.Element {
  const t = useTranslations("common");
  return (
    <div role="status" aria-label={t("loading")} className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <Skeleton className="h-9 w-1/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
