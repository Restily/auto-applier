"use client";

import { useTranslations } from "next-intl";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="pr-12">
          <DialogTitle className="text-[length:var(--text-h3-size)] leading-6">{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={t("close")} className="absolute top-2 right-2">
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
        <ResumeFlow initial={null} manualHref={manualHref} onReady={onReady} deps={deps} />
      </DialogContent>
    </Dialog>
  );
}
