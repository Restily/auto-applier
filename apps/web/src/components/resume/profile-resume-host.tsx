"use client";

import { FileText, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { ProfileEditor } from "@/components/profile/profile-editor";
import { Button } from "@/components/ui/button";
import { saveProfile } from "@/lib/profile/actions";
import { applyChoices, draftToProfileInput, planResumeApplication, type DiffField, type FieldDiff } from "@/lib/profile/merge";
import type { ProfileInput } from "@/lib/profile/schema";
import { retryResumeExtraction } from "@/lib/resume/actions";
import { readResume } from "@/lib/resume/read-client";
import { pollResume, type ResumeState } from "@/lib/resume/status";

import { ReplaceResumeDialog } from "./replace-resume-dialog";
import { ReviewChangesDialog } from "./review-changes-dialog";

type Props = {
  /** The profile as saved in the database. */
  saved: ProfileInput;
  /** The user's current resume row, if any. */
  resume: ResumeState | null;
  mode: "onboarding" | "app";
};

type EditorState = { key: number; initial: ProfileInput; banner: string | null };
type Review = { resume: ResumeState; draft: ProfileInput; diffs: FieldDiff[] };

/**
 * Owns the resume side of the profile pages: decides what an extracted resume does to the profile
 * (fill / silent / review), and renders the attached-file line with Replace and Try again.
 * Extraction never writes the profile except the silent no-op case; the editor's own Save does.
 */
export function ProfileResumeHost({ saved, resume: initialResume, mode }: Props): React.JSX.Element {
  const t = useTranslations("resume");
  const [resume, setResume] = useState<ResumeState | null>(initialResume);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);

  const [{ editor, review }, setView] = useState<{ editor: EditorState; review: Review | null }>(() => {
    const plan = planResumeApplication(saved, initialResume);
    if (plan.kind === "fill" && initialResume) return { editor: { key: 0, initial: plan.initial, banner: initialResume.fileName }, review: null };
    if (plan.kind === "review" && initialResume) return { editor: { key: 0, initial: saved, banner: null }, review: { resume: initialResume, draft: plan.draft, diffs: plan.diffs } };
    return { editor: { key: 0, initial: saved, banner: null }, review: null };
  });

  const silentDone = useRef(false);
  useEffect(() => {
    if (silentDone.current) return;
    silentDone.current = true;
    if (planResumeApplication(saved, initialResume).kind === "silent" && initialResume) {
      void saveProfile({ ...saved, sourceResumeId: initialResume.id });
    }
  }, [saved, initialResume]);

  /** A resume that just became ready (poll or replace dialog): apply the same plan against the saved profile. */
  function handleReady(next: ResumeState): void {
    setResume(next);
    const base = saved;
    const plan = planResumeApplication(base, next);
    if (plan.kind === "fill") {
      setView((v) => ({ editor: { key: v.editor.key + 1, initial: plan.initial, banner: next.fileName }, review: null }));
    } else if (plan.kind === "review") {
      setView((v) => ({ ...v, review: { resume: next, draft: plan.draft, diffs: plan.diffs } }));
    } else if (plan.kind === "silent") {
      void saveProfile({ ...base, sourceResumeId: next.id });
    }
  }

  const handleReadyRef = useRef(handleReady);
  useEffect(() => {
    handleReadyRef.current = handleReady;
  });

  // A resume still being extracted when the page loads: keep polling and apply when ready.
  const processingId = resume?.status === "processing" ? resume.id : null;
  useEffect(() => {
    if (processingId === null) return;
    const ctl = new AbortController();
    void pollResume(processingId, { read: readResume, signal: ctl.signal }).then(
      (r) => {
        if (r.status === "ready") handleReadyRef.current(r);
        else setResume((cur) => (cur ? { ...cur, status: "failed", errorCode: r.status === "failed" ? r.errorCode : null } : cur));
      },
      () => undefined,
    );
    return () => ctl.abort();
  }, [processingId]);

  function applyReview(choices: Record<string, "keep" | "use">): void {
    if (!review) return;
    const merged = applyChoices(saved, review.draft, choices as Partial<Record<DiffField, "keep" | "use">>);
    setView((v) => ({ editor: { key: v.editor.key + 1, initial: { ...merged, sourceResumeId: review.resume.id }, banner: review.resume.fileName }, review: null }));
  }

  async function retry(): Promise<void> {
    if (!resume) return;
    setRetrying(true);
    setRetryError(false);
    const r = await retryResumeExtraction(resume.id).catch(() => ({ ok: false }));
    setRetrying(false);
    if (r.ok) setResume({ ...resume, status: "processing", errorCode: null });
    else setRetryError(true);
  }

  const line = !resume ? null : resume.status === "processing" ? t("attached.processing", { filename: resume.fileName }) : resume.status === "failed" ? t("attached.failed", { filename: resume.fileName }) : t("attached.ready", { filename: resume.fileName });

  const headerSlot = (
    <section aria-label={t("attached.label")} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-[color:var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {resume?.status === "processing" ? <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted-foreground" /> : <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
        <p aria-live="polite" className="min-w-0 text-sm break-words">
          {line ?? ""}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {resume?.status === "failed" ? (
          <Button type="button" variant="outline" onClick={() => void retry()} disabled={retrying} aria-busy={retrying}>
            {retrying ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {t("failed.tryAgain")}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => setReplaceOpen(true)}>
          {resume ? t("replace.button") : t("replace.uploadButton")}
        </Button>
      </div>
      {retryError ? (
        <p role="alert" className="text-sm text-[color:var(--danger)] sm:basis-full">
          {t("failed.retryFailed")}
        </p>
      ) : null}
    </section>
  );

  return (
    <>
      <ProfileEditor key={editor.key} initial={editor.initial} mode={mode} bannerFileName={editor.banner} headerSlot={headerSlot} />
      <ReplaceResumeDialog
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        manualHref={mode === "onboarding" ? "/onboarding/profile" : "/profile"}
        onReady={(next) => {
          setReplaceOpen(false);
          handleReady(next);
        }}
      />
      {review ? <ReviewChangesDialog open fileName={review.resume.fileName} diffs={review.diffs} onApply={applyReview} onCancel={() => setView((v) => ({ ...v, review: null }))} /> : null}
    </>
  );
}
