"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { LANGUAGE_LEVEL, PROFILE_LIMITS, type LanguageEntry } from "@/lib/profile/schema";
import type { ValidationKey } from "@/lib/validation/messages";

import { EntryDialog } from "./entry-dialog";
import { Field } from "./field";
import { SelectField } from "./select-field";

const BLANK: LanguageEntry = { name: "", level: null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: LanguageEntry | null;
  onSave: (entry: LanguageEntry) => void;
};

export function LanguageDialog({ open, onOpenChange, initial, onSave }: Props): React.JSX.Element {
  const [entry, setEntry] = useState<LanguageEntry>(initial ?? BLANK);
  const [error, setError] = useState<ValidationKey | undefined>();
  const t = useTranslations("profile.languages");
  const tl = useTranslations("profile.level");

  return (
    <EntryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? t("dialogEdit") : t("dialogAdd")}
      onSubmit={() => {
        if (entry.name.trim() === "") {
          setError("required");
          document.getElementById("language-name")?.focus();
          return;
        }
        onSave({ ...entry, name: entry.name.trim() });
      }}
    >
      <Field id="language-name" label={t("name")} required error={error}>
        {(c) => (
          <Input
            {...c}
            className="h-11"
            maxLength={PROFILE_LIMITS.languageName}
            value={entry.name}
            onChange={(e) => {
              setError(undefined);
              setEntry((v) => ({ ...v, name: e.target.value }));
            }}
          />
        )}
      </Field>
      <SelectField
        id="language-level"
        label={t("level")}
        value={entry.level}
        options={LANGUAGE_LEVEL.map((v) => ({ value: v, label: tl(v) }))}
        onChange={(level) => setEntry((v) => ({ ...v, level }))}
      />
    </EntryDialog>
  );
}
