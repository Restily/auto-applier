"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { retryResumeExtraction } from "@/lib/resume/actions";
import { readResume } from "@/lib/resume/read-client";
import { pollResume, type ResumeState } from "@/lib/resume/status";
import { uploadResume, type UploadResult } from "@/lib/resume/upload";

import type { DropzoneError } from "./dropzone";
import { ExtractionFailed } from "./extraction-failed";
import { ExtractionProgress } from "./extraction-progress";
import { UploadCard } from "./upload-card";

export type ResumeFlowDeps = {
  upload: (file: File, opts: { onProgress?: (pct: number) => void }) => Promise<UploadResult>;
  read: (id: string) => Promise<ResumeState>;
  retry: (id: string) => Promise<{ ok: boolean }>;
};

const DEFAULT_DEPS: ResumeFlowDeps = { upload: uploadResume, read: readResume, retry: retryResumeExtraction };

type Phase =
  | { kind: "idle"; error: DropzoneError | null }
  | { kind: "uploading"; fileName: string; sizeBytes: number; pct: number }
  | { kind: "extracting"; id: string; fileName: string; sizeBytes?: number; startedAt: number }
  | { kind: "failed"; id: string; fileName: string; retrying: boolean; retryError: boolean };

type ResumeFlowProps = {
  /** The user's current resume, if any: processing resumes polling, failed shows the failure panel. */
  initial: ResumeState | null;
  manualHref: string;
  onReady: (resume: ResumeState) => void;
  /** Show the page heading and the "Fill in manually instead" link (the onboarding step; not the replace dialog). */
  showManualLink?: boolean;
  deps?: ResumeFlowDeps;
};

function initialPhase(initial: ResumeState | null): Phase {
  if (initial?.status === "processing") return { kind: "extracting", id: initial.id, fileName: initial.fileName, startedAt: Date.now() };
  if (initial?.status === "failed") return { kind: "failed", id: initial.id, fileName: initial.fileName, retrying: false, retryError: false };
  return { kind: "idle", error: null };
}

/** S-003 3a-3c as one state machine: idle -> uploading -> extracting -> (ready | failed). */
export function ResumeFlow({ initial, manualHref, onReady, showManualLink = false, deps = DEFAULT_DEPS }: ResumeFlowProps): React.JSX.Element {
  const t = useTranslations("resume.upload");
  const [phase, setPhase] = useState<Phase>(() => initialPhase(initial));
  const onReadyRef = useRef(onReady);
  const depsRef = useRef(deps);
  useEffect(() => {
    onReadyRef.current = onReady;
    depsRef.current = deps;
  });

  const extractingId = phase.kind === "extracting" ? phase.id : null;
  const extractingStart = phase.kind === "extracting" ? phase.startedAt : null;
  useEffect(() => {
    if (extractingId === null) return;
    const ctl = new AbortController();
    void pollResume(extractingId, { read: depsRef.current.read, signal: ctl.signal }).then(
      (result) => {
        if (result.status === "ready") onReadyRef.current(result as ResumeState);
        else setPhase((p) => (p.kind === "extracting" ? { kind: "failed", id: p.id, fileName: p.fileName, retrying: false, retryError: false } : p));
      },
      () => undefined, // aborted on unmount / restart
    );
    return () => ctl.abort();
  }, [extractingId, extractingStart]);

  const onFile = useCallback((file: File): void => {
    setPhase({ kind: "uploading", fileName: file.name, sizeBytes: file.size, pct: 0 });
    void depsRef.current.upload(file, { onProgress: (pct) => setPhase((p) => (p.kind === "uploading" ? { ...p, pct } : p)) }).then((r) => {
      if (!r.ok) return setPhase({ kind: "idle", error: r.error });
      setPhase({ kind: "extracting", id: r.resume.id, fileName: r.resume.file_name, sizeBytes: r.resume.size_bytes, startedAt: Date.now() });
    });
  }, []);

  async function retry(p: Extract<Phase, { kind: "failed" }>): Promise<void> {
    setPhase({ ...p, retrying: true, retryError: false });
    const r = await depsRef.current.retry(p.id).catch(() => ({ ok: false }));
    setPhase(r.ok ? { kind: "extracting", id: p.id, fileName: p.fileName, startedAt: Date.now() } : { ...p, retrying: false, retryError: true });
  }

  return (
    <div className="flex flex-col gap-6">
      {showManualLink ? (
        <div className="flex flex-col gap-2">
          <h1 className="text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-semibold">{t("heading")}</h1>
          <p className="text-muted-foreground">{t("sub")}</p>
        </div>
      ) : null}
      <div className="rounded-[var(--radius-md)] border border-border bg-[color:var(--surface)] p-4 sm:p-6">
        {phase.kind === "idle" ? <UploadCard onFile={onFile} error={phase.error} manualHref={showManualLink ? manualHref : undefined} /> : null}
        {phase.kind === "uploading" ? <ExtractionProgress mode="uploading" fileName={phase.fileName} sizeBytes={phase.sizeBytes} pct={phase.pct} /> : null}
        {phase.kind === "extracting" ? <ExtractionProgress mode="extracting" fileName={phase.fileName} sizeBytes={phase.sizeBytes} startedAt={phase.startedAt} /> : null}
        {phase.kind === "failed" ? (
          <ExtractionFailed fileName={phase.fileName} manualHref={manualHref} retrying={phase.retrying} retryError={phase.retryError} onRetry={() => void retry(phase)} />
        ) : null}
      </div>
    </div>
  );
}
