"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { startGoogleSignInAction } from "@/lib/auth/actions";

/** Google's own four-colour "G" mark: brand asset, deliberately not themed. */
function GoogleMark(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.58-5.15 3.58-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

function GoogleSubmit(): React.JSX.Element {
  const t = useTranslations("auth.google");
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="w-full text-[length:var(--text-ui-size)] whitespace-normal"
    >
      {pending ? <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <GoogleMark />}
      {t("button")}
    </Button>
  );
}

/** Button plus the "or continue with email" divider. Rendered only when GoTrue reports Google as enabled. */
export function GoogleSection(): React.JSX.Element {
  const t = useTranslations("auth.google");
  return (
    <div className="flex flex-col gap-6">
      <form action={startGoogleSignInAction}>
        <GoogleSubmit />
      </form>
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-[length:var(--text-small-size)] text-muted-foreground">{t("divider")}</span>
        <Separator className="flex-1" />
      </div>
    </div>
  );
}
