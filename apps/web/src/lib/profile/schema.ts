import { z } from "zod";

import type { Tables, TablesInsert } from "@/lib/supabase/database.types";

export const YEARS_EXPERIENCE = ["lt_1", "1_2", "3_5", "6_10", "10_plus"] as const;
export const WORK_AUTH = ["authorized", "sponsorship", "other"] as const;
export const RELOCATION = ["not_open", "open", "relocating"] as const;
export const NOTICE_PERIOD = ["immediate", "2_weeks", "1_month", "2_months_plus"] as const;
export const SALARY_PERIOD = ["month", "year"] as const;
export const LANGUAGE_LEVEL = ["native", "fluent", "advanced", "intermediate", "basic"] as const;
export const CURRENCIES: readonly string[] = ["USD", "EUR", "GBP", "RUB", "KZT", "GEL", "AMD", "TRY", "AED", "PLN", "CAD", "AUD"];

/** Same names and values as PROFILE_LIMITS in backend/.../domain/profile.py and the DB checks; schema.test.ts pins all three. */
export const PROFILE_LIMITS = {
  fullName: 200,
  contactEmail: 320,
  phone: 50,
  location: 200,
  headline: 300,
  url: 500,
  workAuthorizationOther: 200,
  titleItem: 100,
  titlesMax: 10,
  skillItem: 60,
  skillsMax: 100,
  entryText: 200,
  languageName: 100,
  description: 2000,
  experienceMax: 50,
  educationMax: 20,
  languagesMax: 20,
} as const;

export type ExperienceEntry = { title: string; company: string; start: string; end: string; current: boolean; description: string };
export type EducationEntry = { institution: string; degree: string; field: string; endYear: number | null };
export type LanguageEntry = { name: string; level: (typeof LANGUAGE_LEVEL)[number] | null };

export type ProfileInput = {
  fullName: string;
  contactEmail: string;
  phone: string;
  location: string;
  headline: string;
  links: { linkedin: string; portfolio: string };
  targetTitles: string[];
  skills: string[];
  yearsExperience: (typeof YEARS_EXPERIENCE)[number] | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  languages: LanguageEntry[];
  workAuthorization: (typeof WORK_AUTH)[number] | null;
  workAuthorizationOther: string;
  relocation: (typeof RELOCATION)[number] | null;
  noticePeriod: (typeof NOTICE_PERIOD)[number] | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: (typeof SALARY_PERIOD)[number] | null;
  sourceResumeId: string | null;
};

// Same expressions as the DB checks and the Python normalizer.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Postgres `char_length` and Python `len` count code points, not UTF-16 units. */
function charLength(value: string): number {
  return Array.from(value.trim()).length;
}

function isHttpUrl(value: string): boolean {
  if (/\s/.test(value)) return false;
  try {
    const u = new URL(value);
    return (u.protocol === "http:" || u.protocol === "https:") && u.host !== "";
  } catch {
    return false;
  }
}

/** Issue messages are validation keys (`validation.<key>` in the catalogs). */
const text = (max: number) =>
  z.string().superRefine((v, ctx) => {
    if (charLength(v) > max) ctx.addIssue({ code: "custom", message: "maxLength" });
  });

const email = z.string().superRefine((v, ctx) => {
  const t = v.trim();
  if (charLength(t) > PROFILE_LIMITS.contactEmail) ctx.addIssue({ code: "custom", message: "maxLength" });
  else if (t !== "" && !EMAIL_RE.test(t)) ctx.addIssue({ code: "custom", message: "email" });
});

const url = z.string().superRefine((v, ctx) => {
  const t = v.trim();
  if (charLength(t) > PROFILE_LIMITS.url) ctx.addIssue({ code: "custom", message: "maxLength" });
  else if (t !== "" && !isHttpUrl(t)) ctx.addIssue({ code: "custom", message: "url" });
});

const L = PROFILE_LIMITS;

export const profileFormatSchema = z
  .object({
    fullName: text(L.fullName),
    contactEmail: email,
    phone: text(L.phone),
    location: text(L.location),
    headline: text(L.headline),
    links: z.object({ linkedin: url, portfolio: url }),
    targetTitles: z.array(text(L.titleItem)).max(L.titlesMax, "maxItems"),
    skills: z.array(text(L.skillItem)).max(L.skillsMax, "maxItems"),
    yearsExperience: z.enum(YEARS_EXPERIENCE).nullable(),
    experience: z
      .array(
        z.object({
          title: text(L.entryText),
          company: text(L.entryText),
          start: z.string(),
          end: z.string(),
          current: z.boolean(),
          description: text(L.description),
        }),
      )
      .max(L.experienceMax, "maxItems"),
    education: z
      .array(
        z.object({
          institution: text(L.entryText),
          degree: text(L.entryText),
          field: text(L.entryText),
          endYear: z.number().int().min(1900).max(2100).nullable(),
        }),
      )
      .max(L.educationMax, "maxItems"),
    languages: z
      .array(z.object({ name: text(L.languageName), level: z.enum(LANGUAGE_LEVEL).nullable() }))
      .max(L.languagesMax, "maxItems"),
    workAuthorization: z.enum(WORK_AUTH).nullable(),
    workAuthorizationOther: text(L.workAuthorizationOther),
    relocation: z.enum(RELOCATION).nullable(),
    noticePeriod: z.enum(NOTICE_PERIOD).nullable(),
    salaryMin: z.number().int().min(0).nullable(),
    salaryMax: z.number().int().min(0).nullable(),
    salaryCurrency: z.string().regex(/^[A-Z]{3}$/).nullable(),
    salaryPeriod: z.enum(SALARY_PERIOD).nullable(),
    sourceResumeId: z.uuid().nullable(),
  })
  .superRefine((p, ctx) => {
    if (p.salaryMin !== null && p.salaryMax !== null && p.salaryMax < p.salaryMin) {
      ctx.addIssue({ code: "custom", message: "salaryRange", path: ["salaryMax"] });
    }
  }) as unknown as z.ZodType<ProfileInput>;

export function emptyProfile(accountEmail: string): ProfileInput {
  return {
    fullName: "",
    contactEmail: accountEmail,
    phone: "",
    location: "",
    headline: "",
    links: { linkedin: "", portfolio: "" },
    targetTitles: [],
    skills: [],
    yearsExperience: null,
    experience: [],
    education: [],
    languages: [],
    workAuthorization: null,
    workAuthorizationOther: "",
    relocation: null,
    noticePeriod: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    sourceResumeId: null,
  };
}

const nz = (s: string): string | null => {
  const t = s.trim();
  return t === "" ? null : t;
};

function cleanList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim();
    const key = t.toLowerCase();
    if (t === "" || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

const month = (s: string): string | null => (MONTH_RE.test(s.trim()) ? s.trim() : null);

export function toDbRow(p: ProfileInput): TablesInsert<"candidate_profiles"> {
  const links: Record<string, string> = {};
  const linkedin = nz(p.links.linkedin);
  const portfolio = nz(p.links.portfolio);
  if (linkedin) links.linkedin = linkedin;
  if (portfolio) links.portfolio = portfolio;

  return {
    full_name: nz(p.fullName),
    contact_email: nz(p.contactEmail),
    phone: nz(p.phone),
    location: nz(p.location),
    headline: nz(p.headline),
    links,
    target_titles: cleanList(p.targetTitles),
    skills: cleanList(p.skills),
    years_experience: p.yearsExperience,
    experience: p.experience.map((e) => ({
      title: e.title.trim(),
      company: nz(e.company),
      start: month(e.start),
      end: e.current ? null : month(e.end),
      current: e.current,
      description: nz(e.description),
    })),
    education: p.education.map((e) => ({
      institution: e.institution.trim(),
      degree: nz(e.degree),
      field: nz(e.field),
      endYear: e.endYear,
    })),
    languages: p.languages.map((l) => ({ name: l.name.trim(), level: l.level })),
    work_authorization: p.workAuthorization,
    work_authorization_other: p.workAuthorization === "other" ? nz(p.workAuthorizationOther) : null,
    relocation: p.relocation,
    notice_period: p.noticePeriod,
    salary_min: p.salaryMin,
    salary_max: p.salaryMax,
    salary_currency: p.salaryCurrency,
    salary_period: p.salaryPeriod,
    source_resume_id: p.sourceResumeId,
  };
}

function pick<T extends string>(list: readonly T[], value: unknown): T | null {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null;
}

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const objects = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(isObject) : []);

export function fromDbRow(r: Tables<"candidate_profiles"> | null, accountEmail: string): ProfileInput {
  if (!r) return emptyProfile(accountEmail);
  const links = isObject(r.links) ? r.links : {};
  return {
    fullName: r.full_name ?? "",
    contactEmail: r.contact_email ?? "",
    phone: r.phone ?? "",
    location: r.location ?? "",
    headline: r.headline ?? "",
    links: { linkedin: str(links.linkedin), portfolio: str(links.portfolio) },
    targetTitles: r.target_titles ?? [],
    skills: r.skills ?? [],
    yearsExperience: pick(YEARS_EXPERIENCE, r.years_experience),
    experience: objects(r.experience).map((e) => ({
      title: str(e.title),
      company: str(e.company),
      start: str(e.start),
      end: str(e.end),
      current: e.current === true,
      description: str(e.description),
    })),
    education: objects(r.education).map((e) => ({
      institution: str(e.institution),
      degree: str(e.degree),
      field: str(e.field),
      endYear: typeof e.endYear === "number" ? e.endYear : null,
    })),
    languages: objects(r.languages).map((l) => ({ name: str(l.name), level: pick(LANGUAGE_LEVEL, l.level) })),
    workAuthorization: pick(WORK_AUTH, r.work_authorization),
    workAuthorizationOther: r.work_authorization_other ?? "",
    relocation: pick(RELOCATION, r.relocation),
    noticePeriod: pick(NOTICE_PERIOD, r.notice_period),
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
    salaryCurrency: r.salary_currency,
    salaryPeriod: pick(SALARY_PERIOD, r.salary_period),
    sourceResumeId: r.source_resume_id,
  };
}
