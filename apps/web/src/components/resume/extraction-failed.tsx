"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type ExtractionFailedProps = {
  fileName: string;
  onRetry: () => void;
  manualHref: string;
  retrying?: boolean;
  retryError?: boolean;
};

/** S-003 3c: the file stays attached; the user can retry or continue by hand. */
export function ExtractionFailed({ fileName, onRetry, manualHref, retrying = false, retryError = false }: ExtractionFailedProps): React.JSX.Element {
  const t = useTranslations("resume.failed");
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-[color:var(--danger-subtle)]">
        <TriangleAlert className="size-6 text-[color:var(--danger)]" />
      </span>
      <h2 className="text-[length:var(--text-h3-size)] leading-6 font-semibold">{t("heading")}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{t("body", { filename: fileName })}</p>
      {retryError ? (
        <p role="alert" className="text-sm text-[color:var(--danger)]">
          {t("retryFailed")}
        </p>
      ) : null}
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button type="button" onClick={onRetry} disabled={retrying} aria-busy={retrying}>
          {retrying ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          {t("tryAgain")}
        </Button>
        <Button asChild variant="outline">
          <Link href={manualHref}>{t("fillManually")}</Link>
        </Button>
      </div>
    </div>
  );
}
