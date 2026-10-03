"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { validateResumeFile, type ResumeFileError } from "@/lib/resume/validate";
import { cn } from "@/lib/utils";

export type DropzoneError = ResumeFileError | "network" | "unknown";

const ERROR_KEY: Record<DropzoneError, "unsupported" | "tooLarge" | "empty" | "network" | "unknown"> = {
  "resume.unsupported_type": "unsupported",
  "resume.too_large": "tooLarge",
  "resume.empty": "empty",
  network: "network",
  unknown: "unknown",
};

type DropzoneProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
  /** A rejection that came back from the server; shown in the same place as the client-side ones. */
  error?: DropzoneError | null;
};

/** S-003 dropzone: a real button opens the picker (keyboard), and the whole zone is a drop target. */
export function Dropzone({ onFile, disabled = false, error = null }: DropzoneProps): React.JSX.Element {
  const t = useTranslations("resume.upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const messageId = useId();
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<DropzoneError | null>(null);
  const shown = localError ?? error;

  function accept(file: File | undefined): void {
    if (!file) return;
    const problem = validateResumeFile(file);
    setLocalError(problem);
    if (problem === null) onFile(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>): void {
    accept(e.target.files?.[0]);
    e.target.value = ""; // picking the same file again must fire change again
  }

  function onDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragging(false);
    if (!disabled) accept(e.dataTransfer.files[0]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-[var(--radius-md)] border-2 border-dashed transition-colors duration-[var(--duration-fast)]",
          dragging ? "border-primary bg-[color:var(--primary-subtle)]" : shown ? "border-[color:var(--danger)]" : "border-input bg-[color:var(--surface)]",
        )}
      >
        <button
          type="button"
          disabled={disabled}
          aria-label={t("dropzoneName")}
          aria-describedby={shown ? messageId : undefined}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] px-4 py-8 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-[color:var(--surface-sunken)]">
            <Upload className="size-6 text-muted-foreground" />
          </span>
          <span aria-hidden="true" className="max-w-xs text-sm">
            {dragging ? t("dropzoneDrag") : t("dropzoneIdle")}
          </span>
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.docx" hidden tabIndex={-1} aria-label={t("fileInputLabel")} onChange={onChange} />
      </div>
      {shown ? (
        <p id={messageId} role="alert" className="text-sm text-[color:var(--danger)]">
          {t(`errors.${ERROR_KEY[shown]}`)}
        </p>
      ) : null}
    </div>
  );
}
