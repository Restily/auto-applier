"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";

/** S-006 6d: a deliberately minimal placeholder; it claims nothing beyond what D5 requires. */
export function PrivacyContent(): React.JSX.Element {
  const t = useTranslations("legal.privacy");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Focus the deep-linked section, or the h1 on plain arrival — never both.
  useEffect(() => {
    if (window.location.hash === "#after-deletion") sectionRef.current?.focus();
    else headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold text-foreground outline-none"
      >
        {t("title")}
      </h1>
      <Alert role="status" className="text-muted-foreground">
        <Info aria-hidden="true" />
        <AlertDescription>{t("placeholder")}</AlertDescription>
      </Alert>
      <section
        id="after-deletion"
        ref={sectionRef}
        tabIndex={-1}
        aria-labelledby="after-deletion-title"
        className="flex flex-col gap-2 scroll-mt-6 outline-none"
      >
        <h2 id="after-deletion-title" className="text-[length:var(--text-h2-size)] leading-[var(--text-h2-line)] font-semibold">
          {t("afterDeletion.title")}
        </h2>
        <p className="text-[length:var(--text-body-size)] leading-[var(--text-body-line)]">{t("afterDeletion.body")}</p>
      </section>
    </div>
  );
}
