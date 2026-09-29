"use client";

import { useTranslations } from "next-intl";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type EntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: () => void;
  children: ReactNode;
};

/**
 * Shared shell of the experience/education/language dialogs. The form is portalled, but React still bubbles its
 * submit event to the editor's <form>, so it is stopped here. The content unmounts on close, which resets the fields.
 */
export function EntryDialog({ open, onOpenChange, title, onSubmit, children }: EntryDialogProps): React.JSX.Element {
  const t = useTranslations("profile.dialog");
  function submit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    e.stopPropagation();
    onSubmit();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          {children}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
