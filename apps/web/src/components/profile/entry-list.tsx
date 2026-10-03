"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { ValidationKey } from "@/lib/validation/messages";

import { FieldError } from "./field";

type EntryListProps = {
  /** Also the id of the add button, so a save error can focus it. */
  id: string;
  summaries: string[];
  addLabel: string;
  emptyLabel: string;
  max: number;
  error?: ValidationKey | undefined;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  children?: ReactNode;
};

/** Summary rows with Edit and Remove (always visible, 44px), then the add button. The forms live in dialogs. */
export function EntryList({ id, summaries, addLabel, emptyLabel, max, error, onAdd, onEdit, onRemove, children }: EntryListProps): React.JSX.Element {
  const t = useTranslations("profile.entries");
  return (
    <div className="flex flex-col gap-3">
      {children}
      {summaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {summaries.map((summary, i) => (
            <li
              // Entries have no id; order is the identity here and the list re-renders wholesale.
              key={i}
              className="flex items-center gap-1 rounded-[var(--radius-md)] border border-border bg-[color:var(--surface-sunken)] py-1 pl-3"
            >
              <span className="min-w-0 flex-1 py-2 text-sm break-words">{summary}</span>
              <Button type="button" variant="ghost" size="icon" aria-label={t("edit", { name: summary })} onClick={() => onEdit(i)}>
                <Pencil aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label={t("remove", { name: summary })} onClick={() => onRemove(i)}>
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button id={id} type="button" variant="outline" onClick={onAdd} disabled={summaries.length >= max}>
          {addLabel}
        </Button>
      </div>
      <FieldError error={error} />
    </div>
  );
}
