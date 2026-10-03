"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ValidationKey } from "@/lib/validation/messages";

import { Field } from "./field";

type ChipsFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  values: string[];
  onChange: (next: string[]) => void;
  /** Maximum number of chips and characters per chip (PROFILE_LIMITS). */
  maxItems: number;
  maxItemLength: number;
  error?: ValidationKey | undefined;
  onClearError?: () => void;
};

/** Creatable combobox: type, then Enter, comma or the Add button; each chip has its own remove button. */
export function ChipsField({ id, label, required, values, onChange, maxItems, maxItemLength, error, onClearError }: ChipsFieldProps): React.JSX.Element {
  const t = useTranslations("profile.chips");
  const listId = useId();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [tooMany, setTooMany] = useState(false);

  const value = draft.trim();
  const showOption = open && value !== "";
  const shownError: ValidationKey | undefined = tooMany ? "maxItems" : error;

  function commit(raw: string): void {
    const item = raw.trim();
    if (item === "") return;
    setDraft("");
    setOpen(false);
    if (values.some((v) => v.toLowerCase() === item.toLowerCase())) return;
    if (values.length >= maxItems) {
      setTooMany(true);
      return;
    }
    setTooMany(false);
    onClearError?.();
    onChange([...values, item]);
  }

  return (
    <Field id={id} label={label} required={required} error={shownError} hint={t("hint")}>
      {(control) => (
        <div className="flex flex-col gap-2">
          {values.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {values.map((v) => (
                <li key={v} className="flex min-h-11 items-center gap-1 rounded-md border border-border bg-[color:var(--surface-sunken)] pl-3 text-sm">
                  <span>{v}</span>
                  <button
                    type="button"
                    aria-label={t("remove", { value: v })}
                    onClick={() => {
                      setTooMany(false);
                      onChange(values.filter((x) => x !== v));
                    }}
                    className="flex size-11 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                {...control}
                type="text"
                role="combobox"
                aria-expanded={showOption}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={showOption ? `${listId}-add` : undefined}
                autoComplete="off"
                maxLength={maxItemLength}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setOpen(true);
                }}
                onBlur={() => setOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commit(draft);
                  } else if (e.key === "Escape" && open) {
                    e.preventDefault();
                    setOpen(false);
                  }
                }}
                className="h-11 w-full min-w-0 scroll-mt-24 rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm"
              />
              <ul
                id={listId}
                role="listbox"
                hidden={!showOption}
                className="absolute inset-x-0 top-full z-20 mt-1 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
              >
                {showOption ? (
                  <li
                    id={`${listId}-add`}
                    role="option"
                    aria-selected="true"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(draft);
                    }}
                    className="flex min-h-11 cursor-pointer items-center rounded-sm bg-accent px-3 text-sm text-accent-foreground"
                  >
                    {t("addOption", { value })}
                  </li>
                ) : null}
              </ul>
            </div>
            <Button type="button" variant="outline" onClick={() => commit(draft)} disabled={value === ""}>
              <Plus aria-hidden="true" />
              {t("add")}
            </Button>
          </div>
        </div>
      )}
    </Field>
  );
}
