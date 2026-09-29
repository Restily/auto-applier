"use client";

import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ResumeState } from "@/lib/resume/status";

import { ResumeFlow, type ResumeFlowDeps } from "./resume-flow";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReady: (resume: ResumeState) => void;
  manualHref: string;
  deps?: ResumeFlowDeps;
};

/** S-003 "Replace resume": the same upload flow, inside a dialog so the editor stays underneath. */
export function ReplaceResumeDialog({ open, onOpenChange, onReady, manualHref, deps }: Props): React.JSX.Element {
  const t = useTranslations("resume.replace");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle className="text-[length:var(--text-h3-size)] leading-6">{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <ResumeFlow initial={null} manualHref={manualHref} onReady={onReady} deps={deps} />
      </DialogContent>
    </Dialog>
  );
}
