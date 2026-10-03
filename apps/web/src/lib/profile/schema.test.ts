import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { Tables } from "@/lib/supabase/database.types";

import { emptyProfile, fromDbRow, PROFILE_LIMITS, profileFormatSchema, toDbRow, type ProfileInput } from "./schema";

const base = (): ProfileInput => emptyProfile("a@example.test");

/** path -> first issue message, the same shape saveProfile returns as fieldErrors. */
function errorsOf(input: unknown): Record<string, string> {
  const r = profileFormatSchema.safeParse(input);
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const issue of r.error.issues) out[issue.path.join(".")] ??= issue.message;
  return out;
}

function set(obj: ProfileInput, dotted: string, value: unknown): ProfileInput {
  const copy = structuredClone(obj) as Record<string, unknown>;
  const keys = dotted.split(".");
  let cur = copy as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
  cur[keys.at(-1)!] = value;
  return copy as unknown as ProfileInput;
}

describe("format rules (D1)", () => {
  it("invalid email -> email", () => {
    expect(errorsOf({ ...base(), contactEmail: "nope" })).toEqual({ contactEmail: "email" });
  });

  it("invalid linkedin url -> url", () => {
    expect(errorsOf(set(base(), "links.linkedin", "not a url"))).toEqual({ "links.linkedin": "url" });
    expect(errorsOf(set(base(), "links.portfolio", "ftp://x.test"))).toEqual({ "links.portfolio": "url" });
  });

  it("empty optional email and links are fine", () => {
    expect(errorsOf({ ...base(), contactEmail: "" })).toEqual({});
  });

  it("max < min -> salaryRange on salaryMax", () => {
    expect(errorsOf({ ...base(), salaryMin: 100, salaryMax: 50 })).toEqual({ salaryMax: "salaryRange" });
  });

  it("max == min ok, max without min ok", () => {
    expect(errorsOf({ ...base(), salaryMin: 100, salaryMax: 100 })).toEqual({});
    expect(errorsOf({ ...base(), salaryMin: null, salaryMax: 100 })).toEqual({});
  });

  it("11 titles -> maxItems", () => {
    const titles = Array.from({ length: 11 }, (_, i) => `t${i}`);
    expect(errorsOf({ ...base(), targetTitles: titles })).toEqual({ targetTitles: "maxItems" });
    expect(errorsOf({ ...base(), targetTitles: titles.slice(0, 10) })).toEqual({});
  });

  it("missing required fields are NOT format errors", () => {
    expect(errorsOf({ ...base(), fullName: "", contactEmail: "", targetTitles: [], skills: [], yearsExperience: null })).toEqual({});
  });
});

const url = (n: number) => `https://x.test/${"a".repeat(n - "https://x.test/".length)}`;
const email = (n: number) => `${"a".repeat(n - "@x.test".length)}@x.test`;
const str = (n: number) => "я".repeat(n);

const entry = () => ({ title: "", company: "", start: "", end: "", current: false, description: "" });
const withExperience = (k: string, v: string) => ({ ...base(), experience: [{ ...entry(), [k]: v }] });
const withEducation = (k: string, v: string) => ({
  ...base(),
  education: [{ institution: "", degree: "", field: "", endYear: null, [k]: v }],
});

const cases: Array<[string, number, (v: string) => unknown, (n: number) => string]> = [
  ["fullName", 200, (v) => ({ ...base(), fullName: v }), str],
  ["headline", 300, (v) => ({ ...base(), headline: v }), str],
  ["phone", 50, (v) => ({ ...base(), phone: v }), str],
  ["location", 200, (v) => ({ ...base(), location: v }), str],
  ["contactEmail", 320, (v) => ({ ...base(), contactEmail: v }), email],
  ["workAuthorizationOther", 200, (v) => ({ ...base(), workAuthorizationOther: v }), str],
  ["links.linkedin", 500, (v) => set(base(), "links.linkedin", v), url],
  ["links.portfolio", 500, (v) => set(base(), "links.portfolio", v), url],
  ["targetTitles.0", 100, (v) => ({ ...base(), targetTitles: [v] }), str],
  ["skills.0", 60, (v) => ({ ...base(), skills: [v] }), str],
  ["experience.0.title", 200, (v) => withExperience("title", v), str],
  ["experience.0.company", 200, (v) => withExperience("company", v), str],
  ["experience.0.description", 2000, (v) => withExperience("description", v), str],
  ["education.0.institution", 200, (v) => withEducation("institution", v), str],
  ["education.0.degree", 200, (v) => withEducation("degree", v), str],
  ["education.0.field", 200, (v) => withEducation("field", v), str],
  ["languages.0.name", 100, (v) => ({ ...base(), languages: [{ name: v, level: null }] }), str],
];

describe("maxLength per field family", () => {
  it.each(cases)("%s: %i passes, %i+1 is maxLength on its own path", (field, limit, build, make) => {
    expect(errorsOf(build(make(limit)))).toEqual({});
    expect(errorsOf(build(make(limit + 1)))).toEqual({ [field]: "maxLength" });
  });

  it("counts code points like Postgres char_length, not UTF-16 units", () => {
    expect(errorsOf({ ...base(), fullName: "😀".repeat(200) })).toEqual({});
    expect(errorsOf({ ...base(), fullName: "😀".repeat(201) })).toEqual({ fullName: "maxLength" });
  });

  it("collection sizes: 51 experience, 21 education, 21 languages, 101 skills -> maxItems", () => {
    expect(errorsOf({ ...base(), experience: Array.from({ length: 51 }, entry) })).toEqual({ experience: "maxItems" });
    expect(errorsOf({ ...base(), experience: Array.from({ length: 50 }, entry) })).toEqual({});
    expect(errorsOf({ ...base(), education: Array.from({ length: 21 }, () => ({ institution: "", degree: "", field: "", endYear: null })) })).toEqual({
      education: "maxItems",
    });
    expect(errorsOf({ ...base(), languages: Array.from({ length: 21 }, () => ({ name: "", level: null })) })).toEqual({ languages: "maxItems" });
    expect(errorsOf({ ...base(), skills: Array.from({ length: 101 }, (_, i) => `s${i}`) })).toEqual({ skills: "maxItems" });
  });
});

describe("PROFILE_LIMITS parity with Python and SQL", () => {
  const root = path.resolve(__dirname, "../../../../..");
  const py = readFileSync(path.join(root, "backend/src/autoapplier/domain/profile.py"), "utf8");
  const migrations = path.join(root, "supabase/migrations");
  const sql = readFileSync(
    path.join(migrations, readdirSync(migrations).find((f) => f.endsWith("m1_profiles_resumes.sql"))!),
    "utf8",
  );

  const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

  it("matches every value of the Python PROFILE_LIMITS (same names, same numbers)", () => {
    const block = /PROFILE_LIMITS[^{]*\{([^}]*)\}/.exec(py)?.[1] ?? "";
    const pyLimits = Object.fromEntries([...block.matchAll(/"(\w+)":\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
    const ours = Object.fromEntries(Object.entries(PROFILE_LIMITS).map(([k, v]) => [snake(k), v]));
    expect(ours).toEqual(pyLimits);
  });

  it("matches the SQL check constraints and trigger limits", () => {
    const L = PROFILE_LIMITS;
    const expectations: Array<[string, number]> = [
      [`char_length\\(full_name\\) <= (\\d+)`, L.fullName],
      [`char_length\\(contact_email\\) <= (\\d+)`, L.contactEmail],
      [`char_length\\(phone\\) <= (\\d+)`, L.phone],
      [`char_length\\(location\\) <= (\\d+)`, L.location],
      [`char_length\\(headline\\) <= (\\d+)`, L.headline],
      [`char_length\\(work_authorization_other\\) <= (\\d+)`, L.workAuthorizationOther],
      [`cardinality\\(target_titles\\) <= (\\d+)`, L.titlesMax],
      [`cardinality\\(skills\\) <= (\\d+)`, L.skillsMax],
      [`jsonb_array_length\\(experience\\) <= (\\d+)`, L.experienceMax],
      [`jsonb_array_length\\(education\\) <= (\\d+)`, L.educationMax],
      [`jsonb_array_length\\(languages\\) <= (\\d+)`, L.languagesMax],
      [`unnest\\(new.target_titles\\) t where pg_catalog.char_length\\(t\\) > (\\d+)`, L.titleItem],
      [`unnest\\(new.skills\\) s where pg_catalog.char_length\\(s\\) > (\\d+)`, L.skillItem],
      [`char_length\\(e ->> 'title'\\) > (\\d+)`, L.entryText],
      [`char_length\\(e ->> 'company'\\) > (\\d+)`, L.entryText],
      [`char_length\\(e ->> 'description'\\) > (\\d+)`, L.description],
      [`char_length\\(e ->> 'institution'\\) > (\\d+)`, L.entryText],
      [`char_length\\(e ->> 'degree'\\) > (\\d+)`, L.entryText],
      [`char_length\\(e ->> 'field'\\) > (\\d+)`, L.entryText],
      [`char_length\\(e ->> 'name'\\) > (\\d+)`, L.languageName],
    ];
    for (const [pattern, expected] of expectations) {
      const m = new RegExp(pattern).exec(sql);
      expect(m, `SQL pattern ${pattern}`).not.toBeNull();
      expect(Number(m![1]), pattern).toBe(expected);
    }
  });
});

describe("toDbRow / fromDbRow", () => {
  const rich: ProfileInput = {
    ...base(),
    fullName: "  Alex Doe ",
    phone: "+995 555 000",
    links: { linkedin: "https://linkedin.com/in/alex", portfolio: "" },
    targetTitles: ["QA", "qa", " SDET "],
    skills: ["Playwright", ""],
    yearsExperience: "6_10",
    experience: [{ title: "QA Lead", company: "Acme", start: "2022-01", end: "", current: true, description: "Led" }],
    education: [{ institution: "State U", degree: "BSc", field: "CS", endYear: 2019 }],
    languages: [{ name: "English", level: "fluent" }],
    workAuthorization: "other",
    workAuthorizationOther: "Blue card",
    relocation: "open",
    noticePeriod: "1_month",
    salaryMin: 3000,
    salaryMax: 4000,
    salaryCurrency: "USD",
    salaryPeriod: "month",
  };

  it("maps empty strings to null, trims, dedupes and drops blanks", () => {
    const row = toDbRow(rich);
    expect(row.full_name).toBe("Alex Doe");
    expect(row.headline).toBeNull();
    expect(row.location).toBeNull();
    expect(row.target_titles).toEqual(["QA", "SDET"]);
    expect(row.skills).toEqual(["Playwright"]);
    expect(row.links).toEqual({ linkedin: "https://linkedin.com/in/alex" });
  });

  it("drops work_authorization_other unless the answer is other", () => {
    expect(toDbRow({ ...rich, workAuthorization: "authorized" }).work_authorization_other).toBeNull();
  });

  it("drops malformed months instead of storing garbage", () => {
    const row = toDbRow({ ...rich, experience: [{ ...rich.experience[0]!, start: "soon" }] });
    expect((row.experience as Array<{ start: string | null }>)[0]!.start).toBeNull();
  });

  it("round-trip keeps application answers and phone (S-004 AC3)", () => {
    const row = { ...toDbRow(rich), user_id: "u", version: 1, is_complete: true, created_at: "", updated_at: "" } as unknown as Tables<"candidate_profiles">;
    const back = fromDbRow(row, "acct@example.test");
    expect(back.phone).toBe("+995 555 000");
    expect(back.workAuthorization).toBe("other");
    expect(back.workAuthorizationOther).toBe("Blue card");
    expect(back.relocation).toBe("open");
    expect(back.noticePeriod).toBe("1_month");
    expect([back.salaryMin, back.salaryMax, back.salaryCurrency, back.salaryPeriod]).toEqual([3000, 4000, "USD", "month"]);
    expect(back.experience).toEqual(rich.experience);
    expect(back.education).toEqual(rich.education);
    expect(back.languages).toEqual(rich.languages);
    expect(back.links).toEqual({ linkedin: "https://linkedin.com/in/alex", portfolio: "" });
  });

  it("no row -> empty profile with the account email; a row keeps its own (even empty) email", () => {
    expect(fromDbRow(null, "acct@example.test").contactEmail).toBe("acct@example.test");
    const row = { ...toDbRow(base()), contact_email: null } as unknown as Tables<"candidate_profiles">;
    expect(fromDbRow(row, "acct@example.test").contactEmail).toBe("");
  });

  it("tolerates malformed jsonb in a row", () => {
    const row = { ...toDbRow(base()), experience: "x", education: [1], languages: null, links: [] } as unknown as Tables<"candidate_profiles">;
    const back = fromDbRow(row, "");
    expect([back.experience, back.education, back.languages]).toEqual([[], [], []]);
  });
});
