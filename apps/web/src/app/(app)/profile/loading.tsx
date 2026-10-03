import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading(): React.JSX.Element {
  const t = useTranslations("profile.loading");
  return (
    <div role="status" aria-label={t("label")} className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <Skeleton className="h-9 w-1/3" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
