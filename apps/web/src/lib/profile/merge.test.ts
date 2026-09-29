import { describe, expect, it } from "vitest";

import type { ResumeState } from "@/lib/resume/status";

import { applyChoices, DIFF_FIELDS, diffProfile, draftToProfileInput, isProfileEmpty, pendingDraft, planResumeApplication } from "./merge";
import { emptyProfile, type ProfileInput } from "./schema";

const base = (): ProfileInput => emptyProfile("acct@example.test");
const full = (): ProfileInput => ({
  ...base(),
  fullName: "Alex Ivanov",
  phone: "+1 555 0100",
  location: "Berlin",
  headline: "Backend",
  targetTitles: ["Backend Engineer", "Tech Lead"],
  skills: ["Python", "Docker"],
  yearsExperience: "6_10",
  experience: [{ title: "Engineer", company: "Acme", start: "2019-03", end: "", current: true, description: "" }],
  education: [{ institution: "TU", degree: "BSc", field: "", endYear: 2014 }],
  languages: [{ name: "English", level: "fluent" }],
  workAuthorization: "authorized",
  salaryMin: 1000,
});

describe("diffProfile", () => {
  it("identical draft -> no diffs", () => {
    expect(diffProfile(full(), full())).toEqual([]);
  });
  it("different name -> exactly one diff", () => {
    const d = { ...full(), fullName: "Alexander Ivanov" };
    expect(diffProfile(full(), d)).toEqual([{ field: "fullName", current: "Alex Ivanov", draft: "Alexander Ivanov" }]);
  });
  it("lists compare order-insensitively", () => {
    const d = { ...full(), skills: ["Docker", "Python"], targetTitles: ["Tech Lead", "Backend Engineer"], languages: [{ name: "English", level: "fluent" as const }] };
    expect(diffProfile(full(), d)).toEqual([]);
  });
  it("a changed list entry is a diff", () => {
    const d = { ...full(), skills: ["Python", "Go"] };
    expect(diffProfile(full(), d).map((x) => x.field)).toEqual(["skills"]);
  });
  it("ignores application answers and the source id", () => {
    const d = { ...full(), workAuthorization: "sponsorship" as const, salaryMin: 5, sourceResumeId: "22222222-2222-4222-8222-222222222222" };
    expect(diffProfile(full(), d)).toEqual([]);
  });
});

describe("applyChoices", () => {
  const draft = { ...full(), fullName: "New Name", skills: ["Go"] };
  it("defaults to keep (AC4)", () => {
    expect(applyChoices(full(), draft, {})).toEqual(full());
  });
  it("use takes the draft value", () => {
    const r = applyChoices(full(), draft, { fullName: "use" });
    expect(r.fullName).toBe("New Name");
    expect(r.skills).toEqual(full().skills);
  });
  it("application answers are never overwritten", () => {
    const d = { ...draft, workAuthorization: "sponsorship" as const, salaryMin: 9, phone: "x" };
    const all = Object.fromEntries(DIFF_FIELDS.map((f) => [f, "use"])) as Record<(typeof DIFF_FIELDS)[number], "use">;
    const r = applyChoices(full(), d, all);
    expect(r.workAuthorization).toBe("authorized");
    expect(r.salaryMin).toBe(1000);
    expect(r.phone).toBe("x");
  });
});

describe("draftToProfileInput", () => {
  it("maps the extraction JSON and keeps base values for missing or bad ones", () => {
    const b = { ...base(), fullName: "Kept" };
    const r = draftToProfileInput(
      {
        full_name: "  Alex  ",
        contact_email: "not-an-email",
        phone: 42,
        skills: ["Python", "python", "", 7],
        years_experience: "6_10",
        links: { linkedin: "https://linkedin.com/in/a", portfolio: "javascript:alert(1)" },
        experience: [{ title: "Eng", company: "Acme", start: "2019-03", end: "bad", current: true }, "junk"],
        education: [{ institution: "TU", end_year: 2014 }],
        languages: [{ name: "English", level: "fluent" }, { name: "X", level: "godlike" }],
        target_titles: [],
      },
      b,
    );
    expect(r.fullName).toBe("Alex");
    expect(r.contactEmail).toBe("acct@example.test");
    expect(r.phone).toBe("");
    expect(r.skills).toEqual(["Python"]);
    expect(r.yearsExperience).toBe("6_10");
    expect(r.links).toEqual({ linkedin: "https://linkedin.com/in/a", portfolio: "" });
    expect(r.experience).toEqual([{ title: "Eng", company: "Acme", start: "2019-03", end: "", current: true, description: "" }]);
    expect(r.education).toEqual([{ institution: "TU", degree: "", field: "", endYear: 2014 }]);
    expect(r.languages).toEqual([{ name: "English", level: "fluent" }, { name: "X", level: null }]);
    expect(r.targetTitles).toEqual([]);
  });
  it("leaves non-resume fields of base untouched", () => {
    const b = { ...full() };
    const r = draftToProfileInput({ full_name: "Z" }, b);
    expect(r.workAuthorization).toBe("authorized");
    expect(r.salaryMin).toBe(1000);
    expect(r.fullName).toBe("Z");
  });
  it("tolerates garbage input", () => {
    expect(draftToProfileInput(null, base())).toEqual(base());
    expect(draftToProfileInput("x", base())).toEqual(base());
  });
});

describe("pendingDraft / isProfileEmpty", () => {
  const r = (over: Partial<ResumeState>): ResumeState => ({ id: "r1", fileName: "cv.pdf", status: "ready", errorCode: null, extracted: {}, ...over });
  it("pendingDraft true only for ready and unapplied", () => {
    expect(pendingDraft(null, r({}))).toBe(true);
    expect(pendingDraft("other", r({}))).toBe(true);
    expect(pendingDraft("r1", r({}))).toBe(false);
    expect(pendingDraft(null, r({ status: "processing" }))).toBe(false);
    expect(pendingDraft(null, r({ status: "failed" }))).toBe(false);
    expect(pendingDraft(null, null)).toBe(false);
  });
  it("isProfileEmpty ignores the defaulted contact email", () => {
    expect(isProfileEmpty(base())).toBe(true);
    expect(isProfileEmpty({ ...base(), contactEmail: "other@example.test" })).toBe(true);
    expect(isProfileEmpty({ ...base(), skills: ["x"] })).toBe(false);
    expect(isProfileEmpty({ ...base(), salaryMin: 1 })).toBe(false);
  });
});

describe("planResumeApplication", () => {
  const ready = (over: Partial<ResumeState> = {}): ResumeState => ({ id: "22222222-2222-4222-8222-222222222222", fileName: "cv.pdf", status: "ready", errorCode: null, extracted: { full_name: "Alex Ivanov", skills: ["Go"] }, ...over });

  it("nothing to do when the resume is not pending", () => {
    expect(planResumeApplication(base(), null)).toEqual({ kind: "none" });
    expect(planResumeApplication(base(), ready({ status: "processing" }))).toEqual({ kind: "none" });
    expect(planResumeApplication({ ...base(), sourceResumeId: ready().id }, ready())).toEqual({ kind: "none" });
  });

  it("an empty profile is filled from the draft and points at the resume", () => {
    const plan = planResumeApplication(base(), ready());
    expect(plan.kind).toBe("fill");
    if (plan.kind !== "fill") return;
    expect(plan.initial.fullName).toBe("Alex Ivanov");
    expect(plan.initial.skills).toEqual(["Go"]);
    expect(plan.initial.sourceResumeId).toBe(ready().id);
  });

  it("an identical draft saves silently", () => {
    const saved = { ...full(), fullName: "Alex Ivanov", skills: ["Go"] };
    const cur = { ...saved, targetTitles: saved.targetTitles };
    expect(planResumeApplication(cur, ready()).kind).toBe("silent");
  });

  it("a differing draft asks for review with only the differing fields", () => {
    const plan = planResumeApplication(full(), ready());
    expect(plan.kind).toBe("review");
    if (plan.kind !== "review") return;
    expect(plan.diffs.map((d) => d.field)).toEqual(["skills"]);
  });
});
