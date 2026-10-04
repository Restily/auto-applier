import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => ({ id: "u1", email: "a@example.test" }) }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) }),
}));

import { getProfile } from "./queries";

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  maybeSingle.mockReset();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("getProfile", () => {
  it("returns the row and the account email", async () => {
    maybeSingle.mockResolvedValue({ data: { user_id: "u1" }, error: null });
    await expect(getProfile()).resolves.toMatchObject({ row: { user_id: "u1" }, accountEmail: "a@example.test" });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs the Supabase error code/message server-side, then throws the unchanged generic error (T-030)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: "42P01", message: 'relation "public.candidate_profiles" does not exist' } });
    await expect(getProfile()).rejects.toThrow("profile_load_failed");
    const line = errorSpy.mock.calls[0]!.map(String).join(" ");
    expect(line).toContain("42P01");
    expect(line).toContain("candidate_profiles");
    expect(line).not.toContain("a@example.test");
    expect(line).not.toContain("u1");
  });
});
