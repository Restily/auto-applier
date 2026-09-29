"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { PROFILE_LIMITS, type EducationEntry } from "@/lib/profile/schema";
import type { ValidationKey } from "@/lib/validation/messages";

import { EntryDialog } from "./entry-dialog";
import { Field } from "./field";

const BLANK: EducationEntry = { institution: "", degree: "", field: "", endYear: null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: EducationEntry | null;
  onSave: (entry: EducationEntry) => void;
};

export function EducationDialog({ open, onOpenChange, initial, onSave }: Props): React.JSX.Element {
  const [entry, setEntry] = useState<EducationEntry>(initial ?? BLANK);
  const [error, setError] = useState<ValidationKey | undefined>();
  const t = useTranslations("profile.education");
  const patch = (p: Partial<EducationEntry>) => setEntry((e) => ({ ...e, ...p }));

  return (
    <EntryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? t("dialogEdit") : t("dialogAdd")}
      onSubmit={() => {
        if (entry.institution.trim() === "") {
          setError("required");
          document.getElementById("education-institution")?.focus();
          return;
        }
        onSave({ ...entry, institution: entry.institution.trim() });
      }}
    >
      <Field id="education-institution" label={t("institution")} required error={error}>
        {(c) => (
          <Input
            {...c}
            className="h-11"
            maxLength={PROFILE_LIMITS.entryText}
            value={entry.institution}
            onChange={(e) => {
              setError(undefined);
              patch({ institution: e.target.value });
            }}
          />
        )}
      </Field>
      <Field id="education-degree" label={t("degree")}>
        {(c) => <Input {...c} className="h-11" maxLength={PROFILE_LIMITS.entryText} value={entry.degree} onChange={(e) => patch({ degree: e.target.value })} />}
      </Field>
      <Field id="education-field" label={t("field")}>
        {(c) => <Input {...c} className="h-11" maxLength={PROFILE_LIMITS.entryText} value={entry.field} onChange={(e) => patch({ field: e.target.value })} />}
      </Field>
      <Field id="education-endYear" label={t("endYear")}>
        {(c) => (
          <Input
            {...c}
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            className="h-11"
            value={entry.endYear ?? ""}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              patch({ endYear: Number.isFinite(n) ? Math.min(2100, Math.max(1900, n)) : null });
            }}
          />
        )}
      </Field>
    </EntryDialog>
  );
}
