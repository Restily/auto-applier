"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { downloadExport } from "@/lib/account/export-client";

import { SettingsCard } from "./settings-card";

export function DataCard(): React.JSX.Element {
  const t = useTranslations("settings");
  const [preparing, setPreparing] = useState(false);

  async function download(): Promise<void> {
    setPreparing(true);
    const result = await downloadExport();
    setPreparing(false);
    if (result === "started") toast.success(t("data.success"));
    else toast.error(t("data.error"));
  }

  return (
    <SettingsCard title={t("data.title")}>
      <p className="text-[length:var(--text-body-size)] text-muted-foreground">{t("data.body")}</p>
      <div className="flex md:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={preparing}
          aria-label={preparing ? t("data.preparing") : undefined}
          onClick={() => void download()}
          className="w-full md:w-auto"
        >
          {preparing ? <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : t("data.download")}
        </Button>
      </div>
    </SettingsCard>
  );
}
