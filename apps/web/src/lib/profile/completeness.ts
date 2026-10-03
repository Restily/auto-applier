import type { ProfileInput } from "./schema";

/** Mirrors the generated `is_complete` column of candidate_profiles exactly. */
export const REQUIRED_FIELDS = ["fullName", "contactEmail", "targetTitles", "skills", "yearsExperience"] as const;
export type RequiredField = (typeof REQUIRED_FIELDS)[number];

function present(p: ProfileInput, field: RequiredField): boolean {
  switch (field) {
    case "fullName":
      return p.fullName.trim() !== "";
    case "contactEmail":
      return p.contactEmail.trim() !== "";
    case "targetTitles":
      return p.targetTitles.some((t) => t.trim() !== "");
    case "skills":
      return p.skills.some((s) => s.trim() !== "");
    case "yearsExperience":
      return p.yearsExperience !== null;
  }
}

export function missingProfileFields(p: ProfileInput | null): RequiredField[] {
  if (!p) return [...REQUIRED_FIELDS];
  return REQUIRED_FIELDS.filter((f) => !present(p, f));
}

export function isProfileStarted(p: ProfileInput | null): boolean {
  return p !== null && missingProfileFields(p).length < REQUIRED_FIELDS.length;
}

export type ChecklistView = {
  total: 1;
  done: 0 | 1;
  steps: [{ id: "profile"; state: "incomplete" | "complete"; missing: RequiredField[] | null }];
};

export function checklistView(p: ProfileInput | null): ChecklistView {
  const missing = missingProfileFields(p);
  if (missing.length === 0) return { total: 1, done: 1, steps: [{ id: "profile", state: "complete", missing: null }] };
  return {
    total: 1,
    done: 0,
    steps: [{ id: "profile", state: "incomplete", missing: isProfileStarted(p) ? missing : null }],
  };
}
