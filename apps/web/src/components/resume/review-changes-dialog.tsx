"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { DiffField, FieldDiff } from "@/lib/profile/merge";

type Choice = "keep" | "use";
type Choices = Partial<Record<DiffField, Choice>>;

type Props = {
  open: boolean;
  fileName: string;
  diffs: FieldDiff[];
  onApply: (choices: Record<string, Choice>) => void;
  onCancel: () => void;
};

const LEGEND: Record<DiffField, string> = {
  fullName: "fields.fullName",
  contactEmail: "fields.contactEmail",
  phone: "fields.phone",
  location: "fields.location",
  links: "fields.links",
  targetTitles: "fields.targetTitles",
  headline: "fields.headline",
  skills: "fields.skills",
  yearsExperience: "fields.yearsExperience",
  experience: "sections.experience",
  education: "sections.education",
  languages: "sections.languages",
};

/** S-003 3e. "Keep current" is always the default: re-uploading must never silently overwrite an edited profile. */
export function ReviewChangesDialog({ open, fileName, diffs, onApply, onCancel }: Props): React.JSX.Element {
  const t = useTranslations("resume.review");
  const tp = useTranslations("profile");
  const [choices, setChoices] = useState<Choices>({});

  function summarize(diff: FieldDiff, value: unknown): string {
    if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) return t("empty");
    if (diff.field === "yearsExperience") return tp(`years.${String(value)}`);
    if (diff.field === "links") {
      const l = value as { linkedin: string; portfolio: string };
      return [l.linkedin, l.portfolio].filter(Boolean).join(", ") || t("empty");
    }
    if (diff.field === "skills" || diff.field === "targetTitles") {
      const list = value as string[];
      return list.length > 4 ? `${list.slice(0, 4).join(", ")} (${t("count", { count: list.length })})` : list.join(", ");
    }
    if (Array.isArray(value)) return t("count", { count: value.length });
    return String(value);
  }

  const set = (all: Choice): void => setChoices(Object.fromEntries(diffs.map((d) => [d.field, all])));
  const choiceOf = (f: DiffField): Choice => choices[f] ?? "keep";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[length:var(--text-h3-size)] leading-6">{t("title")}</DialogTitle>
          <DialogDescription>{t("body", { filename: fileName })}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {diffs.map((d) => (
            <fieldset key={d.field} className="flex min-w-0 flex-col gap-1 border-t border-border pt-3">
              <legend className="mb-1 text-sm font-semibold">{tp(LEGEND[d.field])}</legend>
              <RadioGroup value={choiceOf(d.field)} onValueChange={(v) => setChoices((c) => ({ ...c, [d.field]: v as Choice }))} aria-label={tp(LEGEND[d.field])} className="gap-1">
                {(["keep", "use"] as const).map((kind) => {
                  const id = `review-${d.field}-${kind}`;
                  return (
                    <label key={kind} htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] px-2 py-2 hover:bg-[color:var(--surface-sunken)]">
                      <RadioGroupItem id={id} value={kind} className="mt-0.5" />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium">{kind === "keep" ? t("keepCurrent") : t("useNew")}</span>
                        <span className="text-sm break-words text-muted-foreground">{summarize(d, kind === "keep" ? d.current : d.draft)}</span>
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            </fieldset>
          ))}
        </div>

        <DialogFooter className="sm:flex-wrap">
          <Button type="button" variant="outline" onClick={() => set("keep")}>
            {t("keepAll")}
          </Button>
          <Button type="button" variant="outline" onClick={() => set("use")}>
            {t("useAll")}
          </Button>
          <Button type="button" onClick={() => onApply(Object.fromEntries(diffs.map((d) => [d.field, choiceOf(d.field)])))}>
            {t("apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
