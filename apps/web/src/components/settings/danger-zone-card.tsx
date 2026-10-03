import { useTranslations } from "next-intl";

import { DeleteAccountDialog } from "./delete-account-dialog";
import { SettingsCard } from "./settings-card";

export function DangerZoneCard({ email }: { email: string }): React.JSX.Element {
  const t = useTranslations("settings.danger");
  return (
    <SettingsCard title={t("title")}>
      <p className="text-[length:var(--text-body-size)] text-muted-foreground">{t("body")}</p>
      <div className="flex md:justify-end">
        <DeleteAccountDialog email={email} />
      </div>
    </SettingsCard>
  );
}
