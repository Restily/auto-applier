"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SignInNotice } from "@/lib/auth/notices";

/**
 * Form-level alert. Receives programmatic focus when it appears so keyboard and screen-reader users
 * land on it. `danger` sits on --danger-subtle, `neutral` on --surface-sunken; body text is always
 * --foreground (MASTER §2.4), the semantic colour stays on the icon.
 */
export function FormAlert({
  tone,
  children,
  actions,
}: {
  tone: "danger" | "neutral";
  children: ReactNode;
  actions?: ReactNode;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const Icon = tone === "danger" ? AlertCircle : Info;
  return (
    <Alert
      ref={ref}
      tabIndex={-1}
      className={cn(
        "text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        tone === "danger" ? "border-[var(--danger)] bg-[var(--danger-subtle)]" : "bg-[var(--surface-sunken)]",
      )}
    >
      <Icon aria-hidden="true" className={tone === "danger" ? "text-[var(--danger)]" : "text-muted-foreground"} />
      <AlertDescription className="text-[length:var(--text-ui-size)] leading-[var(--text-ui-line)] text-foreground">
        <p>{children}</p>
        {actions ? <div className="flex flex-wrap gap-x-2">{actions}</div> : null}
      </AlertDescription>
    </Alert>
  );
}

/** MASTER §7 "page failed" pattern, used when the Google round-trip itself failed. */
function FailurePanel(): React.JSX.Element {
  const common = useTranslations("common");
  const t = useTranslations("auth.notices");
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--danger-subtle)]">
        <AlertTriangle aria-hidden="true" className="size-6 text-[var(--danger)]" />
      </span>
      <h2 className="text-[length:var(--text-h3-size)] leading-[var(--text-h3-line)] font-semibold">
        {common("genericError.title")}
      </h2>
      <p className="text-[length:var(--text-body-size)] text-muted-foreground">{t("oauthFailedBody")}</p>
      <Button asChild>
        <Link href="/sign-in">{common("retry")}</Link>
      </Button>
    </div>
  );
}

export type { SignInNotice };

/** What the `?notice=` value on /sign-in shows: an alert, the failure panel, or a one-time toast. */
export function AuthNotice({ notice }: { notice?: SignInNotice }): React.JSX.Element | null {
  const t = useTranslations("auth.notices");
  const toasted = useRef(false);

  useEffect(() => {
    if (toasted.current) return;
    if (notice === "password_updated") toast.success(t("passwordUpdated"));
    else if (notice === "session_expired") toast.message(t("sessionExpired"));
    else return;
    toasted.current = true;
    // Strip the one-shot marker so a refresh does not repeat the toast; keep `next`.
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    url.searchParams.delete("reason");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }, [notice, t]);

  if (notice === "oauth_cancelled") return <FormAlert tone="neutral">{t("oauthCancelled")}</FormAlert>;
  if (notice === "oauth_failed") return <FailurePanel />;
  return null;
}
