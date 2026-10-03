"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { PROFILE_LIMITS, type ExperienceEntry } from "@/lib/profile/schema";
import type { ValidationKey } from "@/lib/validation/messages";

import { EntryDialog } from "./entry-dialog";
import { Field, Textarea } from "./field";

const BLANK: ExperienceEntry = { title: "", company: "", start: "", end: "", current: false, description: "" };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null adds a new entry. */
  initial: ExperienceEntry | null;
  onSave: (entry: ExperienceEntry) => void;
};

export function ExperienceDialog({ open, onOpenChange, initial, onSave }: Props): React.JSX.Element {
  const t = useTranslations("profile.experience");
  return (
    <EntryDialogBody open={open} onOpenChange={onOpenChange} title={initial ? t("dialogEdit") : t("dialogAdd")} initial={initial} onSave={onSave} />
  );
}

function EntryDialogBody({ open, onOpenChange, title, initial, onSave }: Props & { title: string }): React.JSX.Element {
  const [entry, setEntry] = useState<ExperienceEntry>(initial ?? BLANK);
  const [error, setError] = useState<ValidationKey | undefined>();
  const t = useTranslations("profile.experience");
  const patch = (p: Partial<ExperienceEntry>) => setEntry((e) => ({ ...e, ...p }));

  // Remount the fields whenever the dialog is opened for a different entry.
  return (
    <EntryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      onSubmit={() => {
        if (entry.title.trim() === "") {
          setError("required");
          document.getElementById("experience-title")?.focus();
          return;
        }
        onSave({ ...entry, title: entry.title.trim() });
      }}
    >
      <Field id="experience-title" label={t("title")} required error={error}>
        {(c) => (
          <Input
            {...c}
            className="h-11"
            maxLength={PROFILE_LIMITS.entryText}
            value={entry.title}
            onChange={(e) => {
              setError(undefined);
              patch({ title: e.target.value });
            }}
          />
        )}
      </Field>
      <Field id="experience-company" label={t("company")}>
        {(c) => <Input {...c} className="h-11" maxLength={PROFILE_LIMITS.entryText} value={entry.company} onChange={(e) => patch({ company: e.target.value })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="experience-start" label={t("start")}>
          {(c) => <Input {...c} type="month" className="h-11" value={entry.start} onChange={(e) => patch({ start: e.target.value })} />}
        </Field>
        <Field id="experience-end" label={t("end")}>
          {(c) => (
            <Input {...c} type="month" className="h-11" disabled={entry.current} value={entry.current ? "" : entry.end} onChange={(e) => patch({ end: e.target.value })} />
          )}
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-5 accent-[color:var(--primary)]"
          checked={entry.current}
          onChange={(e) => patch({ current: e.target.checked })}
        />
        {t("current")}
      </label>
      <Field id="experience-description" label={t("description")}>
        {(c) => <Textarea {...c} maxLength={PROFILE_LIMITS.description} value={entry.description} onChange={(e) => patch({ description: e.target.value })} />}
      </Field>
    </EntryDialog>
  );
}
