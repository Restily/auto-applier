import type { ResumeState } from "@/lib/resume/status";

import {
  LANGUAGE_LEVEL,
  PROFILE_LIMITS as L,
  YEARS_EXPERIENCE,
  type EducationEntry,
  type ExperienceEntry,
  type LanguageEntry,
  type ProfileInput,
} from "./schema";

/** Application answers (work authorization, salary, ...) never come from a resume, so they are not diffed or applied. */
export const DIFF_FIELDS = [
  "fullName",
  "contactEmail",
  "phone",
  "location",
  "links",
  "targetTitles",
  "headline",
  "skills",
  "yearsExperience",
  "experience",
  "education",
  "languages",
] as const;

export type DiffField = (typeof DIFF_FIELDS)[number];
export type FieldDiff = { field: DiffField; current: unknown; draft: unknown };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const objects = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(isObject) : []);

function text(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  return Array.from(t).length > max ? "" : t;
}

function url(v: unknown): string {
  const t = text(v, L.url);
  if (t === "" || /\s/.test(t)) return "";
  try {
    const u = new URL(t);
    return (u.protocol === "http:" || u.protocol === "https:") && u.host !== "" ? t : "";
  } catch {
    return "";
  }
}

function strings(v: unknown, itemMax: number, max: number): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    const t = text(item, itemMax);
    const key = t.toLowerCase();
    if (t === "" || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, max);
}

function level(v: unknown): LanguageEntry["level"] {
  return typeof v === "string" && (LANGUAGE_LEVEL as readonly string[]).includes(v) ? (v as LanguageEntry["level"]) : null;
}

/** Lenient parse of the worker's `extracted` JSON (snake_case): bad or empty values are dropped and `base` shows through. */
export function draftToProfileInput(extracted: unknown, base: ProfileInput): ProfileInput {
  if (!isObject(extracted)) return base;
  const out: ProfileInput = { ...base };

  const fullName = text(extracted.full_name, L.fullName);
  if (fullName) out.fullName = fullName;
  const email = text(extracted.contact_email, L.contactEmail);
  if (email && EMAIL_RE.test(email)) out.contactEmail = email;
  const phone = text(extracted.phone, L.phone);
  if (phone) out.phone = phone;
  const location = text(extracted.location, L.location);
  if (location) out.location = location;
  const headline = text(extracted.headline, L.headline);
  if (headline) out.headline = headline;

  const links = isObject(extracted.links) ? extracted.links : {};
  const linkedin = url(links.linkedin);
  const portfolio = url(links.portfolio);
  if (linkedin || portfolio) out.links = { linkedin: linkedin || base.links.linkedin, portfolio: portfolio || base.links.portfolio };

  const titles = strings(extracted.target_titles, L.titleItem, L.titlesMax);
  if (titles.length > 0) out.targetTitles = titles;
  const skills = strings(extracted.skills, L.skillItem, L.skillsMax);
  if (skills.length > 0) out.skills = skills;

  const years = extracted.years_experience;
  if (typeof years === "string" && (YEARS_EXPERIENCE as readonly string[]).includes(years)) out.yearsExperience = years as ProfileInput["yearsExperience"];

  const experience: ExperienceEntry[] = objects(extracted.experience)
    .map((e) => {
      const current = e.current === true;
      const start = typeof e.start === "string" && MONTH_RE.test(e.start) ? e.start : "";
      const end = !current && typeof e.end === "string" && MONTH_RE.test(e.end) ? e.end : "";
      return { title: text(e.title, L.entryText), company: text(e.company, L.entryText), start, end, current, description: text(e.description, L.description) };
    })
    .filter((e) => e.title !== "")
    .slice(0, L.experienceMax);
  if (experience.length > 0) out.experience = experience;

  const education: EducationEntry[] = objects(extracted.education)
    .map((e) => {
      const y = e.end_year ?? e.endYear;
      return {
        institution: text(e.institution, L.entryText),
        degree: text(e.degree, L.entryText),
        field: text(e.field, L.entryText),
        endYear: typeof y === "number" && Number.isInteger(y) && y >= 1900 && y <= 2100 ? y : null,
      };
    })
    .filter((e) => e.institution !== "")
    .slice(0, L.educationMax);
  if (education.length > 0) out.education = education;

  const languages: LanguageEntry[] = objects(extracted.languages)
    .map((l) => ({ name: text(l.name, L.languageName), level: level(l.level) }))
    .filter((l) => l.name !== "")
    .slice(0, L.languagesMax);
  if (languages.length > 0) out.languages = languages;

  return out;
}

/** True when nothing but the defaulted contact email (and the source pointer) is filled in. */
export function isProfileEmpty(p: ProfileInput): boolean {
  const { contactEmail, sourceResumeId, ...rest } = p;
  void contactEmail;
  void sourceResumeId;
  return Object.values(rest).every((v) => {
    if (v === null || v === "") return true;
    if (Array.isArray(v)) return v.length === 0;
    if (isObject(v)) return Object.values(v).every((x) => x === "");
    return false;
  });
}

function canonical(v: unknown): string {
  if (Array.isArray(v)) return JSON.stringify(v.map(canonical).sort());
  if (isObject(v)) {
    return JSON.stringify(
      Object.keys(v)
        .sort()
        .map((k) => [k, canonical(v[k])]),
    );
  }
  if (typeof v === "string") return JSON.stringify(v.trim().toLowerCase());
  return JSON.stringify(v ?? null);
}

/** Only fields that differ; list order is irrelevant. */
export function diffProfile(current: ProfileInput, draft: ProfileInput): FieldDiff[] {
  return DIFF_FIELDS.filter((f) => canonical(current[f]) !== canonical(draft[f])).map((field) => ({ field, current: current[field], draft: draft[field] }));
}

/** A field with no explicit choice is kept: extraction never silently overwrites the user's data. */
export function applyChoices(current: ProfileInput, draft: ProfileInput, choices: Partial<Record<DiffField, "keep" | "use">>): ProfileInput {
  const out: ProfileInput = { ...current };
  const target = out as Record<DiffField, unknown>;
  for (const f of DIFF_FIELDS) {
    if (choices[f] === "use") target[f] = draft[f];
  }
  return out;
}

/** The newest resume is ready but its result has not been applied to the profile yet. */
export function pendingDraft(profileSourceResumeId: string | null, resume: ResumeState | null): boolean {
  return resume !== null && resume.status === "ready" && resume.id !== profileSourceResumeId;
}

export type ResumePlan =
  | { kind: "none" }
  | { kind: "fill"; initial: ProfileInput }
  | { kind: "silent" }
  | { kind: "review"; draft: ProfileInput; diffs: FieldDiff[] };

/** What to do with a freshly extracted resume (S-003 3d/3e): fill an empty profile, save silently, or ask. */
export function planResumeApplication(saved: ProfileInput, resume: ResumeState | null): ResumePlan {
  if (resume === null || !pendingDraft(saved.sourceResumeId, resume)) return { kind: "none" };
  const draft = draftToProfileInput(resume.extracted, saved);
  if (isProfileEmpty(saved)) return { kind: "fill", initial: { ...draft, sourceResumeId: resume.id } };
  const diffs = diffProfile(saved, draft);
  return diffs.length === 0 ? { kind: "silent" } : { kind: "review", draft, diffs };
}
