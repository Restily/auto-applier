"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { extractionPhase } from "@/lib/resume/status";

function formatSize(bytes: number): string {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type Props =
  | { mode: "uploading"; fileName: string; sizeBytes?: number; pct: number }
  | { mode: "extracting"; fileName: string; sizeBytes?: number; startedAt?: number };

/** S-003 3b. Upload is determinate; extraction is indeterminate with a status line that rotates and is announced politely. */
export function ExtractionProgress(props: Props): React.JSX.Element {
  const t = useTranslations("resume");
  const [now, setNow] = useState<number | null>(null);
  const [origin] = useState(() => Date.now());
  const started = props.mode === "extracting" ? (props.startedAt ?? origin) : origin;

  useEffect(() => {
    if (props.mode !== "extracting") return;
    const tick = (): void => setNow(Date.now());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [props.mode]);

  const phase = extractionPhase(now === null ? 0 : now - started);
  const meta = props.sizeBytes ? ` · ${formatSize(props.sizeBytes)}` : "";

  return (
    <div className="flex flex-col gap-4">
      <p className="break-words text-center text-sm font-medium">
        {props.fileName}
        {meta}
      </p>
      {props.mode === "uploading" ? (
        <>
          <div
            role="progressbar"
            aria-label={t("upload.uploadProgressLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={props.pct}
            className="h-2 w-full overflow-hidden rounded-full bg-primary/20"
          >
            <div className="h-full bg-primary transition-[width] duration-[var(--duration-base)]" style={{ width: `${props.pct}%` }} />
          </div>
          <p aria-live="polite" className="text-center text-sm text-muted-foreground">
            {t("upload.uploading", { filename: props.fileName })}
          </p>
        </>
      ) : (
        <>
          <div role="progressbar" aria-label={t("extraction.label")} className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div className="h-full w-full animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p aria-live="polite" className="text-sm font-medium">
              {t(`extraction.phase${phase}`)}
            </p>
            <p className="text-sm text-muted-foreground">{t("extraction.timeNote")}</p>
          </div>
        </>
      )}
    </div>
  );
}
