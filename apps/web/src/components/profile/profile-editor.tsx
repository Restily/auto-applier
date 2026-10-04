"use client";

import { CircleCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveProfile, type SaveProfileResult } from "@/lib/profile/actions";
import type { RequiredField } from "@/lib/profile/completeness";
import { issuesToFieldErrors } from "@/lib/profile/field-errors";
import {
  PROFILE_LIMITS,
  YEARS_EXPERIENCE,
  profileFormatSchema,
  type EducationEntry,
  type ExperienceEntry,
  type LanguageEntry,
  type ProfileInput,
} from "@/lib/profile/schema";
import type { ValidationKey } from "@/lib/validation/messages";

import { ApplicationAnswers } from "./application-answers";
import { ChipsField } from "./chips-field";
import { EducationDialog } from "./education-dialog";
import { EntryList } from "./entry-list";
import { ExperienceDialog } from "./experience-dialog";
import { Field } from "./field";
import { LanguageDialog } from "./language-dialog";
import { SaveBar } from "./save-bar";
import { SectionCard } from "./section-card";
import { SelectField } from "./select-field";

export type ProfileEditorProps = {
  initial: ProfileInput;
  mode: "onboarding" | "app";
  /** Shows the dismissible "We filled this from {filename}" banner. */
  bannerFileName?: string | null;
  /** The resume task injects Replace resume / the extraction notice here. */
  headerSlot?: ReactNode;
  onSaved?: (r: Extract<SaveProfileResult, { ok: true }>) => void;
  /** Reports whether the form has unsaved changes (also once on mount), so the host can ask before replacing them. */
  onDirtyChange?: (dirty: boolean) => void;
};

type Errors = Record<string, ValidationKey>;
type DialogState<T> = { index: number | null; initial: T | null } | null;

/** Fixed focus order: error key -> id of the control to focus. */
const FOCUS_ORDER: ReadonlyArray<readonly [string, string]> = [
  ["fullName", "profile-fullName"],
  ["contactEmail", "profile-contactEmail"],
  ["phone", "profile-phone"],
  ["location", "profile-location"],
  ["links.linkedin", "profile-linkedin"],
  ["links.portfolio", "profile-portfolio"],
  ["targetTitles", "profile-targetTitles"],
  ["headline", "profile-headline"],
  ["skills", "profile-skills"],
  ["yearsExperience", "profile-yearsExperience"],
  ["experience", "profile-experience-add"],
  ["education", "profile-education-add"],
  ["languages", "profile-languages-add"],
  ["workAuthorizationOther", "profile-workAuthorizationOther"],
  ["salaryMin", "profile-salaryMin"],
  ["salaryMax", "profile-salaryMax"],
];

const MISSING_ERROR: Record<RequiredField, ValidationKey> = {
  fullName: "required",
  contactEmail: "required",
  targetTitles: "minTitles",
  skills: "minSkills",
  yearsExperience: "required",
};

/** "skills.3" belongs to the "skills" control, "experience.0.title" to the experience list. */
function normalizeKey(key: string): string {
  const head = key.split(".")[0] ?? key;
  return head === "links" ? key : head;
}

function normalizeErrors(raw: Errors): Errors {
  const out: Errors = {};
  for (const [k, v] of Object.entries(raw)) out[normalizeKey(k)] ??= v;
  return out;
}

function firstFocusId(errors: Errors): string | undefined {
  return FOCUS_ORDER.find(([key]) => errors[key] !== undefined)?.[1];
}

export function ProfileEditor({ initial, mode, bannerFileName, headerSlot, onSaved, onDirtyChange }: ProfileEditorProps): React.JSX.Element {
  const t = useTranslations("profile");
  const te = useTranslations("profile.entries");
  const tc = useTranslations("common");
  const router = useRouter();

  const [values, setValues] = useState<ProfileInput>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [experienceDialog, setExperienceDialog] = useState<DialogState<ExperienceEntry>>(null);
  const [educationDialog, setEducationDialog] = useState<DialogState<EducationEntry>>(null);
  const [languageDialog, setLanguageDialog] = useState<DialogState<LanguageEntry>>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null);
  const savingRef = useRef(false);

  const dirty = useMemo(() => JSON.stringify(values) !== baseline, [values, baseline]);

  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  });
  useEffect(() => {
    onDirtyChangeRef.current?.(dirty);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent): void => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  useEffect(() => {
    if (!focusRequest) return;
    const el = document.getElementById(focusRequest.id);
    el?.focus();
    el?.scrollIntoView?.({ block: "center" });
  }, [focusRequest]);

  function patch(p: Partial<ProfileInput>): void {
    setValues((v) => ({ ...v, ...p }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(p)) {
        if (k === "salaryMin") delete next.salaryMax;
        if (k === "links") {
          delete next["links.linkedin"];
          delete next["links.portfolio"];
        }
        delete next[k];
      }
      return next;
    });
  }

  function showErrors(next: Errors): void {
    setErrors(next);
    const id = firstFocusId(next);
    if (id) setFocusRequest({ id });
  }

  async function submit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (savingRef.current) return;

    // D1: only format problems block the write; they are checked locally first so nothing is sent.
    const parsed = profileFormatSchema.safeParse(values);
    if (!parsed.success) {
      showErrors(normalizeErrors(issuesToFieldErrors(parsed.error.issues)));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const result = await saveProfile(values);
      if (!result.ok) {
        if ("fieldErrors" in result) showErrors(normalizeErrors(result.fieldErrors));
        else toast.error(t("saveFailed"));
        return;
      }
      setBaseline(JSON.stringify(values));
      if (result.missing.length > 0) {
        const missingErrors: Errors = {};
        for (const f of result.missing) missingErrors[f] = MISSING_ERROR[f];
        showErrors(missingErrors);
        toast.info(t("savedIncomplete"));
      } else {
        setErrors({});
        toast.success(tc("saved"));
        if (mode === "onboarding") router.push("/onboarding");
      }
      onSaved?.(result);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const experienceSummaries = values.experience.map((x) => {
    const range = x.start || x.end || x.current ? ` · ${x.start || "…"}–${x.current ? te("present") : x.end || "…"}` : "";
    return [x.title || te("untitled"), x.company].filter(Boolean).join(" · ") + range;
  });
  const educationSummaries = values.education.map((x) =>
    [x.degree, x.institution, x.endYear === null ? "" : String(x.endYear)].filter(Boolean).join(" · ") || te("untitled"),
  );
  const languageSummaries = values.languages.map((x) => (x.level ? `${x.name} — ${t(`level.${x.level}`)}` : x.name));

  function upsert<T>(list: T[], index: number | null, item: T): T[] {
    return index === null ? [...list, item] : list.map((x, i) => (i === index ? item : x));
  }

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="mx-auto flex w-full max-w-[720px] flex-col gap-6" aria-labelledby="profile-title">
      <h1 id="profile-title" className="text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-semibold">
        {t("title")}
      </h1>

      {headerSlot}

      {bannerFileName && bannerOpen ? (
        <div role="status" className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-[color:var(--surface-sunken)] py-1 pl-4 text-sm">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-[color:var(--success)]" />
          <p className="min-w-0 flex-1 py-2">{t("filledFromResume", { filename: bannerFileName })}</p>
          <Button type="button" variant="ghost" size="icon" aria-label={t("dismissBanner")} onClick={() => setBannerOpen(false)}>
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      <SectionCard id="contact" title={t("sections.contact")}>
        <Field id="profile-fullName" label={t("fields.fullName")} required error={errors.fullName}>
          {(c) => (
            <Input {...c} className="h-11 scroll-mt-24" autoComplete="name" maxLength={PROFILE_LIMITS.fullName} value={values.fullName} onChange={(e) => patch({ fullName: e.target.value })} />
          )}
        </Field>
        <Field id="profile-contactEmail" label={t("fields.contactEmail")} required error={errors.contactEmail}>
          {(c) => (
            <Input {...c} className="h-11 scroll-mt-24" type="email" autoComplete="email" value={values.contactEmail} onChange={(e) => patch({ contactEmail: e.target.value })} />
          )}
        </Field>
        <Field id="profile-phone" label={t("fields.phone")} error={errors.phone}>
          {(c) => (
            <Input {...c} className="h-11 scroll-mt-24" type="tel" autoComplete="tel" maxLength={PROFILE_LIMITS.phone} value={values.phone} onChange={(e) => patch({ phone: e.target.value })} />
          )}
        </Field>
        <Field id="profile-location" label={t("fields.location")} error={errors.location}>
          {(c) => (
            <Input {...c} className="h-11 scroll-mt-24" maxLength={PROFILE_LIMITS.location} value={values.location} onChange={(e) => patch({ location: e.target.value })} />
          )}
        </Field>
        <fieldset className="flex min-w-0 flex-col gap-4">
          <legend className="mb-2 text-sm leading-none font-medium">{t("fields.links")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="profile-linkedin" label={t("fields.linkedin")} error={errors["links.linkedin"]}>
              {(c) => (
                <Input {...c} className="h-11 scroll-mt-24" type="url" inputMode="url" value={values.links.linkedin} onChange={(e) => patch({ links: { ...values.links, linkedin: e.target.value } })} />
              )}
            </Field>
            <Field id="profile-portfolio" label={t("fields.portfolio")} error={errors["links.portfolio"]}>
              {(c) => (
                <Input {...c} className="h-11 scroll-mt-24" type="url" inputMode="url" value={values.links.portfolio} onChange={(e) => patch({ links: { ...values.links, portfolio: e.target.value } })} />
              )}
            </Field>
          </div>
        </fieldset>
      </SectionCard>

      <SectionCard id="targetRole" title={t("sections.targetRole")}>
        <ChipsField
          id="profile-targetTitles"
          label={t("fields.targetTitles")}
          required
          values={values.targetTitles}
          onChange={(targetTitles) => patch({ targetTitles })}
          maxItems={PROFILE_LIMITS.titlesMax}
          maxItemLength={PROFILE_LIMITS.titleItem}
          error={errors.targetTitles}
        />
        <Field id="profile-headline" label={t("fields.headline")} error={errors.headline}>
          {(c) => (
            <Input {...c} className="h-11 scroll-mt-24" maxLength={PROFILE_LIMITS.headline} value={values.headline} onChange={(e) => patch({ headline: e.target.value })} />
          )}
        </Field>
      </SectionCard>

      <SectionCard id="skills" title={t("sections.skills")}>
        <ChipsField
          id="profile-skills"
          label={t("fields.skills")}
          required
          values={values.skills}
          onChange={(skills) => patch({ skills })}
          maxItems={PROFILE_LIMITS.skillsMax}
          maxItemLength={PROFILE_LIMITS.skillItem}
          error={errors.skills}
        />
      </SectionCard>

      <SectionCard id="experience" title={t("sections.experience")}>
        <SelectField
          id="profile-yearsExperience"
          label={t("fields.yearsExperience")}
          required
          value={values.yearsExperience}
          options={YEARS_EXPERIENCE.map((v) => ({ value: v, label: t(`years.${v}`) }))}
          onChange={(yearsExperience) => patch({ yearsExperience })}
          error={errors.yearsExperience}
        />
        <EntryList
          id="profile-experience-add"
          summaries={experienceSummaries}
          addLabel={t("experience.add")}
          emptyLabel={t("experience.empty")}
          max={PROFILE_LIMITS.experienceMax}
          error={errors.experience}
          onAdd={() => setExperienceDialog({ index: null, initial: null })}
          onEdit={(i) => setExperienceDialog({ index: i, initial: values.experience[i] ?? null })}
          onRemove={(i) => patch({ experience: values.experience.filter((_, j) => j !== i) })}
        />
      </SectionCard>

      <SectionCard id="education" title={t("sections.education")}>
        <EntryList
          id="profile-education-add"
          summaries={educationSummaries}
          addLabel={t("education.add")}
          emptyLabel={t("education.empty")}
          max={PROFILE_LIMITS.educationMax}
          error={errors.education}
          onAdd={() => setEducationDialog({ index: null, initial: null })}
          onEdit={(i) => setEducationDialog({ index: i, initial: values.education[i] ?? null })}
          onRemove={(i) => patch({ education: values.education.filter((_, j) => j !== i) })}
        />
      </SectionCard>

      <SectionCard id="languages" title={t("sections.languages")}>
        <EntryList
          id="profile-languages-add"
          summaries={languageSummaries}
          addLabel={t("languages.add")}
          emptyLabel={t("languages.empty")}
          max={PROFILE_LIMITS.languagesMax}
          error={errors.languages}
          onAdd={() => setLanguageDialog({ index: null, initial: null })}
          onEdit={(i) => setLanguageDialog({ index: i, initial: values.languages[i] ?? null })}
          onRemove={(i) => patch({ languages: values.languages.filter((_, j) => j !== i) })}
        />
      </SectionCard>

      <SectionCard id="answers" title={t("sections.answers")}>
        <ApplicationAnswers values={values} onChange={patch} errors={errors} />
      </SectionCard>

      <SaveBar dirty={dirty} saving={saving} />

      {experienceDialog ? (
        <ExperienceDialog
          open
          key={`exp-${experienceDialog.index ?? "new"}`}
          initial={experienceDialog.initial}
          onOpenChange={(open) => !open && setExperienceDialog(null)}
          onSave={(entry) => {
            patch({ experience: upsert(values.experience, experienceDialog.index, entry) });
            setExperienceDialog(null);
          }}
        />
      ) : null}
      {educationDialog ? (
        <EducationDialog
          open
          key={`edu-${educationDialog.index ?? "new"}`}
          initial={educationDialog.initial}
          onOpenChange={(open) => !open && setEducationDialog(null)}
          onSave={(entry) => {
            patch({ education: upsert(values.education, educationDialog.index, entry) });
            setEducationDialog(null);
          }}
        />
      ) : null}
      {languageDialog ? (
        <LanguageDialog
          open
          key={`lang-${languageDialog.index ?? "new"}`}
          initial={languageDialog.initial}
          onOpenChange={(open) => !open && setLanguageDialog(null)}
          onSave={(entry) => {
            patch({ languages: upsert(values.languages, languageDialog.index, entry) });
            setLanguageDialog(null);
          }}
        />
      ) : null}
    </form>
  );
}
