"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { setLocale } from "@/i18n/actions";
import { isLocale, LOCALES, type Locale } from "@/i18n/config";

import { SettingsCard } from "./settings-card";

/** The radio mirrors the active locale (useLocale), so a switch via the header menu is reflected without a reload (B-006). */
export function LanguageCard(): React.JSX.Element {
  const t = useTranslations("settings");
  const router = useRouter();
  const active = useLocale() as Locale;
  const [selected, setSelected] = useState<Locale>(active);
  const [seenActive, setSeenActive] = useState<Locale>(active);
  // Optimistic selection while the switch is in flight; whenever the active locale changes, it wins.
  if (seenActive !== active) {
    setSeenActive(active);
    setSelected(active);
  }
  const [, startTransition] = useTransition();

  function choose(next: string): void {
    if (!isLocale(next) || next === selected) return;
    setSelected(next);
    startTransition(async () => {
      const { persisted } = await setLocale(next);
      // The UI stays in the new language even if the profile write failed (S-005).
      if (!persisted) toast.error(t("language.saveFailed"));
      router.refresh();
    });
  }

  return (
    <SettingsCard title={t("language.title")}>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-muted-foreground">{t("language.label")}</legend>
        <RadioGroup value={selected} onValueChange={choose} aria-label={t("language.label")}>
          {LOCALES.map((code) => (
            <div key={code} className="flex min-h-11 items-center gap-3">
              <RadioGroupItem value={code} id={`language-${code}`} />
              {/* Autonyms: each option is always shown in its own language. */}
              <Label htmlFor={`language-${code}`} className="min-h-11 flex-1 cursor-pointer">
                {t(`language.${code}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
    </SettingsCard>
  );
}
