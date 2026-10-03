import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const STEPS = ["signUp", "resume", "profile"] as const;

/** Focus-shell progress for the onboarding flow: sign up and resume are behind, profile is the current step. */
export function StepDots({ current }: { current: (typeof STEPS)[number] }): React.JSX.Element {
  const t = useTranslations("onboarding.steps");
  const at = STEPS.indexOf(current);
  return (
    <nav aria-label={t("label")} className="mx-auto mb-6 w-full max-w-[720px]">
      <ol className="flex items-center justify-center gap-4 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === at ? "step" : undefined} className={cn("flex items-center gap-2", i === at ? "font-semibold text-foreground" : "text-muted-foreground")}>
            <span aria-hidden="true" className={cn("size-2.5 rounded-full border border-primary", i <= at ? "bg-primary" : "bg-transparent")} />
            {t(s)}
          </li>
        ))}
      </ol>
    </nav>
  );
}
