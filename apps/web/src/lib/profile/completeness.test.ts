import { describe, expect, it } from "vitest";

import { checklistView, isProfileStarted, missingProfileFields } from "./completeness";
import { emptyProfile, type ProfileInput } from "./schema";

function complete(): ProfileInput {
  return {
    ...emptyProfile("a@example.test"),
    fullName: "Alex Doe",
    targetTitles: ["QA Engineer"],
    skills: ["Playwright"],
    yearsExperience: "3_5",
  };
}

// Same cases as the pgTAP is_complete tests in supabase/tests/database/m1_profiles_resumes.test.sql.
describe("missingProfileFields", () => {
  it("null -> all five, not started", () => {
    expect(missingProfileFields(null)).toEqual(["fullName", "contactEmail", "targetTitles", "skills", "yearsExperience"]);
    expect(isProfileStarted(null)).toBe(false);
  });

  it("name only -> the other four, in fixed order", () => {
    const p = { ...emptyProfile(""), fullName: "Alex" };
    expect(missingProfileFields(p)).toEqual(["contactEmail", "targetTitles", "skills", "yearsExperience"]);
    expect(isProfileStarted(p)).toBe(true);
  });

  it("whitespace name counts as missing", () => {
    expect(missingProfileFields({ ...complete(), fullName: "   " })).toEqual(["fullName"]);
  });

  it("whitespace email counts as missing", () => {
    expect(missingProfileFields({ ...complete(), contactEmail: "  " })).toEqual(["contactEmail"]);
  });

  it("all five -> complete", () => {
    expect(missingProfileFields(complete())).toEqual([]);
  });
});

describe("checklistView", () => {
  it("partial lists what is missing", () => {
    const view = checklistView({ ...complete(), contactEmail: "", skills: [] });
    expect(view.done).toBe(0);
    expect(view.steps[0]).toEqual({ id: "profile", state: "incomplete", missing: ["contactEmail", "skills"] });
  });

  it("untouched has missing null", () => {
    expect(checklistView(null).steps[0]).toEqual({ id: "profile", state: "incomplete", missing: null });
    expect(checklistView(emptyProfile("")).steps[0].missing).toBeNull();
  });

  it("complete", () => {
    const view = checklistView(complete());
    expect(view).toEqual({ total: 1, done: 1, steps: [{ id: "profile", state: "complete", missing: null }] });
  });
});
