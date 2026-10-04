import { afterEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ["select", "eq", "order", "limit"]) chain[m] = () => chain;
chain.maybeSingle = maybeSingle;
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ from: () => chain }) }));

import { getCurrentResume } from "./queries";

afterEach(() => vi.restoreAllMocks());

describe("getCurrentResume", () => {
  it("logs the Supabase error code/message, then throws the unchanged generic error (T-030)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    maybeSingle.mockResolvedValue({ data: null, error: { code: "42501", message: "permission denied for table resumes" } });
    await expect(getCurrentResume()).rejects.toThrow("resume_load_failed");
    const line = spy.mock.calls[0]!.map(String).join(" ");
    expect(line).toContain("42501");
    expect(line).toContain("permission denied");
  });

  it("returns null when there is no resume", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getCurrentResume()).resolves.toBeNull();
  });
});
