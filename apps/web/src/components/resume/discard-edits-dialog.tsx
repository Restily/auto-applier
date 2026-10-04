"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  fileName: string;
  /** Use the resume and drop the unsaved edits. */
  onUseResume: () => void;
  /** Leave the editor as it is (also Esc and the backdrop): nothing is ever silently lost. */
  onKeepEdits: () => void;
};

/** A resume finished extracting while the profile editor had unsaved changes: applying it would replace them, so ask first. */
export function DiscardEditsDialog({ fileName, onUseResume, onKeepEdits }: Props): React.JSX.Element {
  const t = useTranslations("resume.discard");
  const keepRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open onOpenChange={(open) => !open && onKeepEdits()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => {
          // The safe choice gets focus, not the destructive one.
          e.preventDefault();
          keepRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-[length:var(--text-h3-size)] leading-6">{t("title")}</DialogTitle>
          <DialogDescription>{t("body", { filename: fileName })}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row">
          <Button type="button" variant="outline" onClick={onUseResume}>
            {t("use")}
          </Button>
          <Button ref={keepRef} type="button" onClick={onKeepEdits}>
            {t("keep")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
