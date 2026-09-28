"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isLocale, LOCALES, type Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

export function LanguageSwitcher({ locale }: { locale: Locale }): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: string): void {
    if (!isLocale(next) || next === locale) return;
    startTransition(async () => {
      const { persisted } = await setLocale(next);
      // The UI stays in the newly chosen language even when the profile write failed (S-005).
      if (!persisted) toast.error(t("settings.language.saveFailed"));
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          aria-label={`${t("shell.language.label")}: ${locale.toUpperCase()}`}
          className="px-3"
        >
          {locale.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={choose}>
          {LOCALES.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} className="min-h-11 pr-8">
              {/* Autonyms: each language is always shown in its own language. */}
              {t(`shell.language.${code}`)}
              {code === locale ? <Check aria-hidden="true" className="ml-auto size-4" /> : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
