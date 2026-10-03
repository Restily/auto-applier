"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ChecklistView } from "@/lib/profile/completeness";

import { StepCard } from "./step-card";

/** S-001 Onboarding checklist. M1 ships exactly one step; the component takes the view so later steps just extend it. */
export function Checklist({ view }: { view: ChecklistView }): React.JSX.Element {
  const t = useTranslations("onboarding");
  const step = view.steps[0];
  const complete = step.state === "complete";
  const progressText = t("progress", { n: view.done, total: view.total });

  const missing = step.missing;
  const body =
    missing && missing.length > 0
      ? t("missing", {
          // Plain comma join: the spec examples are comma-separated in both languages, while Intl.ListFormat("ru") inserts "и".
          list: missing.map((f) => t(`missingFields.${f}`)).join(", "),
        })
      : t("step.profile.body");

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-semibold">{t("heading")}</h1>
        <p className="text-sm text-muted-foreground">{progressText}</p>
        {/* Own markup: the kit's Progress does not forward `value` to the root, so aria-valuenow would be missing. */}
        <div
          role="progressbar"
          aria-label={progressText}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((view.done / view.total) * 100)}
          className="h-2 w-full overflow-hidden rounded-full bg-primary/20"
        >
          <div className="h-full bg-primary transition-[width] duration-[var(--duration-base)]" style={{ width: `${(view.done / view.total) * 100}%` }} />
        </div>
      </div>

      <StepCard
        state={step.state}
        title={t("step.profile.title")}
        body={body}
        doneLabel={t("step.profile.done")}
        action={complete ? { label: t("step.profile.actionDone"), href: "/profile" } : { label: t("step.profile.action"), href: "/onboarding/resume" }}
      />

      {complete ? (
        <section aria-labelledby="all-done-heading" className="flex flex-col items-start gap-3">
          <h2 id="all-done-heading" className="text-[length:var(--text-h3-size)] leading-6 font-semibold">
            {t("allDone.heading")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("allDone.body")}</p>
          <Button asChild>
            <Link href="/profile">{t("allDone.action")}</Link>
          </Button>
        </section>
      ) : null}
    </div>
  );
}
