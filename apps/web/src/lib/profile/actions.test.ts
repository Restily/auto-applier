import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser: async () => ({ id: "u-1", email: "a@example.test" }) }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: () => ({ upsert }) }),
}));

import { saveProfile } from "./actions";
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

beforeEach(() => {
  upsert.mockReset().mockResolvedValue({ error: null });
  revalidatePath.mockReset();
});

describe("saveProfile", () => {
  it("format error -> fieldErrors and no upsert", async () => {
    const r = await saveProfile({ ...complete(), contactEmail: "nope" });
    expect(r).toEqual({ ok: false, fieldErrors: { contactEmail: "email" } });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("over-long fullName -> fieldErrors.fullName === maxLength, no upsert, not save_failed", async () => {
    const r = await saveProfile({ ...complete(), fullName: "x".repeat(201) });
    expect(r).toEqual({ ok: false, fieldErrors: { fullName: "maxLength" } });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("garbage input -> fieldErrors, no upsert", async () => {
    const r = await saveProfile("nope");
    expect(r.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("DB check_violation (23514) -> save_failed", async () => {
    upsert.mockResolvedValue({ error: { code: "23514", message: "check" } });
    expect(await saveProfile(complete())).toEqual({ ok: false, formError: "save_failed" });
  });

  it("db error -> save_failed", async () => {
    upsert.mockResolvedValue({ error: { code: "XX000", message: "boom" } });
    expect(await saveProfile(complete())).toEqual({ ok: false, formError: "save_failed" });
  });

  it("missing required only -> upsert called, ok with isComplete false and the missing list", async () => {
    const r = await saveProfile({ ...complete(), skills: [], fullName: "" });
    expect(r).toEqual({ ok: true, isComplete: false, missing: ["fullName", "skills"] });
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = upsert.mock.calls[0]!;
    expect(row).toMatchObject({ user_id: "u-1", full_name: null, skills: [] });
    expect(opts).toEqual({ onConflict: "user_id" });
  });

  it("complete -> ok isComplete true, revalidates both pages", async () => {
    expect(await saveProfile(complete())).toEqual({ ok: true, isComplete: true, missing: [] });
    expect(revalidatePath).toHaveBeenCalledWith("/onboarding");
    expect(revalidatePath).toHaveBeenCalledWith("/profile");
  });
});
