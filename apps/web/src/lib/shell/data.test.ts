import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: null };
const results: Record<string, Result> = {};

function chain(table: string) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "limit"]) c[m] = () => c;
  c.maybeSingle = async () => results[table];
  c.then = (resolve: (v: Result) => void) => resolve(results[table]);
  return c;
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: (t: string) => chain(t) }),
}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "u1", email: "alex.kim@example.test" }),
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "ru" }));

import { getShellData } from "@/lib/shell/data";

describe("getShellData", () => {
  beforeEach(() => {
    results.credit_balances = { data: { balance: 20 }, error: null };
    results.credit_ledger = { data: [{ id: 1 }], error: null };
    results.candidate_profiles = { data: { is_complete: true }, error: null };
  });

  it("signupBonusGranted true with a signup_grant row", async () => {
    const data = await getShellData();
    expect(data).toEqual({
      email: "alex.kim@example.test",
      initials: "AK",
      balance: 20,
      locale: "ru",
      onboardingComplete: true,
      signupBonusGranted: true,
    });
  });

  it("false and balance 0 when the ledger is empty (D5 re-sign-up)", async () => {
    results.credit_balances = { data: null, error: null };
    results.credit_ledger = { data: [], error: null };
    results.candidate_profiles = { data: null, error: null };
    const data = await getShellData();
    expect(data.signupBonusGranted).toBe(false);
    expect(data.balance).toBe(0);
    expect(data.onboardingComplete).toBe(false);
  });

  it("uses one initial for a single-word local part", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth/session", () => ({
      requireUser: async () => ({ id: "u2", email: "alex@example.test" }),
    }));
    const { getShellData: fresh } = await import("@/lib/shell/data");
    expect((await fresh()).initials).toBe("A");
  });
});
