"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { Dropzone, type DropzoneError } from "./dropzone";

type UploadCardProps = {
  onFile: (file: File) => void;
  error?: DropzoneError | null;
  manualHref?: string;
};

/** S-003 3a body: the dropzone plus the manual escape hatch. */
export function UploadCard({ onFile, error = null, manualHref }: UploadCardProps): React.JSX.Element {
  const t = useTranslations("resume.upload");
  return (
    <div className="flex flex-col gap-4">
      <Dropzone onFile={onFile} error={error} />
      {manualHref ? (
        <Link href={manualHref} className="inline-flex min-h-11 items-center self-start text-sm font-medium text-primary underline underline-offset-4">
          {t("manual")}
        </Link>
      ) : null}
    </div>
  );
}
