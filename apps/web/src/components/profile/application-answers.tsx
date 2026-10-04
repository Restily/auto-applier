"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { NOTICE_PERIOD, PROFILE_LIMITS, RELOCATION, WORK_AUTH, type ProfileInput } from "@/lib/profile/schema";
import type { ValidationKey } from "@/lib/validation/messages";

import { Field } from "./field";
import { SalaryFields } from "./salary-fields";
import { SelectField } from "./select-field";

type Props = {
  values: ProfileInput;
  onChange: (patch: Partial<ProfileInput>) => void;
  errors: Record<string, ValidationKey>;
};

/** S-004 Application answers. None of these gate `is_complete`. */
export function ApplicationAnswers({ values, onChange, errors }: Props): React.JSX.Element {
  const t = useTranslations("profile.answers");
  return (
    <>
      <SelectField
        id="profile-workAuthorization"
        label={t("workAuthorization")}
        value={values.workAuthorization}
        options={WORK_AUTH.map((v) => ({ value: v, label: t(`workAuth.${v}`) }))}
        onChange={(workAuthorization) => onChange({ workAuthorization })}
      />
      {values.workAuthorization === "other" ? (
        <Field id="profile-workAuthorizationOther" label={t("workAuthorizationOther")} error={errors.workAuthorizationOther}>
          {(control) => (
            <Input
              {...control}
              className="h-11"
              maxLength={PROFILE_LIMITS.workAuthorizationOther}
              value={values.workAuthorizationOther}
              onChange={(e) => onChange({ workAuthorizationOther: e.target.value })}
            />
          )}
        </Field>
      ) : null}
      <SelectField
        id="profile-relocation"
        label={t("relocation")}
        value={values.relocation}
        options={RELOCATION.map((v) => ({ value: v, label: t(`relocationOption.${v}`) }))}
        onChange={(relocation) => onChange({ relocation })}
      />
      <SelectField
        id="profile-noticePeriod"
        label={t("noticePeriod")}
        value={values.noticePeriod}
        options={NOTICE_PERIOD.map((v) => ({ value: v, label: t(`noticeOption.${v}`) }))}
        onChange={(noticePeriod) => onChange({ noticePeriod })}
      />
      <SalaryFields
        id="profile-salaryMax"
        minId="profile-salaryMin"
        value={values}
        onChange={onChange}
        minError={errors.salaryMin}
        error={errors.salaryMax}
      />
    </>
  );
}
