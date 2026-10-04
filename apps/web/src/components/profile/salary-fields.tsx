"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES, SALARY_PERIOD, type ProfileInput } from "@/lib/profile/schema";
import type { ValidationKey } from "@/lib/validation/messages";
import { Label } from "@/components/ui/label";

import { FieldError } from "./field";

type SalaryValue = Pick<ProfileInput, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">;

type SalaryFieldsProps = {
  /** Id of the Max input (the range error and the focus order point at it). */
  id: string;
  /** Id of the Min input, so a min-specific error can take focus. */
  minId: string;
  value: SalaryValue;
  onChange: (patch: Partial<SalaryValue>) => void;
  /** Error on Min (e.g. above the integer limit). */
  minError?: ValidationKey | undefined;
  /** Error on Max (range or above the integer limit). */
  error?: ValidationKey | undefined;
};

function toNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** One fieldset so a screen reader announces the group. Min and Max stay paired; currency and period wrap below at 375px. */
export function SalaryFields({ id, minId, value, onChange, minError, error }: SalaryFieldsProps): React.JSX.Element {
  const t = useTranslations("profile.salary");
  const tp = useTranslations("profile");
  const uid = useId();
  const errorId = `${uid}-error`;
  const shownError = error ?? minError;
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">{t("legend")}</legend>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 basis-40 flex-col gap-2">
          <Label htmlFor={minId}>{t("min")}</Label>
          <Input
            id={minId}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className="h-11 scroll-mt-24"
            aria-invalid={minError ? true : undefined}
            aria-describedby={minError ? errorId : undefined}
            value={value.salaryMin ?? ""}
            onChange={(e) => onChange({ salaryMin: toNumber(e.target.value) })}
          />
        </div>
        <div className="flex flex-1 basis-40 flex-col gap-2">
          <Label htmlFor={id}>{t("max")}</Label>
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className="h-11 scroll-mt-24"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            value={value.salaryMax ?? ""}
            onChange={(e) => onChange({ salaryMax: toNumber(e.target.value) })}
          />
        </div>
        <div className="flex min-w-28 flex-col gap-2">
          <Label htmlFor={`${uid}-currency`}>{t("currency")}</Label>
          <Select value={value.salaryCurrency ?? ""} onValueChange={(v) => onChange({ salaryCurrency: v })}>
            <SelectTrigger id={`${uid}-currency`} className="w-full data-[size=default]:h-11">
              <SelectValue placeholder={tp("select")} />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-28 flex-col gap-2">
          <Label htmlFor={`${uid}-period`}>{t("period")}</Label>
          <Select
            value={value.salaryPeriod ?? ""}
            onValueChange={(v) => onChange({ salaryPeriod: SALARY_PERIOD.find((p) => p === v) ?? null })}
          >
            <SelectTrigger id={`${uid}-period`} className="w-full data-[size=default]:h-11">
              <SelectValue placeholder={tp("select")} />
            </SelectTrigger>
            <SelectContent>
              {SALARY_PERIOD.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <FieldError id={errorId} error={shownError} />
    </fieldset>
  );
}
