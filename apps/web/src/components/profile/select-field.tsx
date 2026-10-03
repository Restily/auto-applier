"use client";

import { useTranslations } from "next-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ValidationKey } from "@/lib/validation/messages";

import { Field } from "./field";

type SelectFieldProps<T extends string> = {
  id: string;
  label: string;
  required?: boolean;
  value: T | null;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  error?: ValidationKey | undefined;
};

export function SelectField<T extends string>({ id, label, required, value, options, onChange, error }: SelectFieldProps<T>): React.JSX.Element {
  const t = useTranslations("profile");
  return (
    <Field id={id} label={label} required={required} error={error}>
      {(control) => (
        <Select
          value={value ?? ""}
          onValueChange={(v) => {
            const match = options.find((o) => o.value === v);
            if (match) onChange(match.value);
          }}
        >
          <SelectTrigger {...control} className="w-full scroll-mt-24 data-[size=default]:h-11">
            <SelectValue placeholder={t("select")} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}
