"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountAction } from "@/lib/account/actions";
import { emailsMatch } from "@/lib/account/confirm";

/** S-006 6b. The trigger is the Danger zone button, so Radix returns focus to it on close. */
export function DeleteAccountDialog({ email }: { email: string }): React.JSX.Element {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const matches = emailsMatch(typed, email);
  const showHint = typed.trim().length > 0 && !matches;

  function changeOpen(next: boolean): void {
    if (pending && !next) return;
    setOpen(next);
    if (!next) {
      setTyped("");
      setFailed(false);
    }
  }

  // Outside-click means "I changed my mind" (S-006 AC3); Radix's AlertDialog ignores it by itself.
  useEffect(() => {
    if (!open || pending) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Element && event.target.matches('[data-slot="alert-dialog-overlay"]')) changeOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pending]);

  useEffect(() => {
    if (failed) alertRef.current?.focus();
  }, [failed]);

  async function confirm(): Promise<void> {
    setFailed(false);
    setPending(true);
    try {
      const result = await deleteAccountAction(typed);
      // On success the action redirects and never returns; stay "pending" until the navigation lands.
      if (result && !result.ok) {
        setFailed(true);
        setPending(false);
      }
    } catch (error) {
      // Next's redirect is delivered as a thrown control-flow signal in some runtimes; let it through.
      if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" className="w-full md:w-auto">
          {t("settings.danger.delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        className="max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none sm:max-w-[420px]"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-[var(--danger)]" />
            <AlertDialogTitle>{t("account.delete.heading")}</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-3">
              <p>{t("account.delete.body")}</p>
              <p className="text-xs">
                {t("account.delete.fingerprintNote")}{" "}
                <Link
                  href="/privacy#after-deletion"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {t("legal.privacy.linkLabel")}
                </Link>
              </p>
            </div>
          </AlertDialogDescription>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-confirm-email" className="block leading-relaxed">
            {t.rich("account.delete.instruction", { email, strong: (chunks) => <strong className="break-all">{chunks}</strong> })}
          </Label>
          <Input
            id="delete-confirm-email"
            ref={inputRef}
            type="email"
            autoComplete="off"
            value={typed}
            disabled={pending}
            onChange={(event) => setTyped(event.target.value)}
          />
          <div aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
            {showHint ? t("account.delete.hint") : null}
          </div>
        </div>

        {failed ? (
          <Alert ref={alertRef} tabIndex={-1} variant="destructive" className="outline-none">
            <TriangleAlert aria-hidden="true" />
            <AlertDescription>{t("account.delete.error")}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={pending} className="min-h-11 w-full sm:w-auto">
            {t("account.delete.cancel")}
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!matches || pending}
            aria-label={pending ? t("account.delete.deleting") : undefined}
            onClick={() => void confirm()}
            className="min-h-11 w-full sm:w-auto"
          >
            {pending ? <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : t("account.delete.confirm")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
