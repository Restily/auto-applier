import { afterEach, describe, expect, it, vi } from "vitest";

import { logDbError } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("logDbError", () => {
  it("logs scope, code and message only (no details/hint that may carry row data)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = { code: "42P01", message: 'relation "candidate_profiles" does not exist', details: "secret@example.test", hint: "x" };
    logDbError("profile_load_failed", err);
    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0]!.map(String).join(" ");
    expect(line).toContain("profile_load_failed");
    expect(line).toContain("42P01");
    expect(line).toContain("does not exist");
    expect(line).not.toContain("secret@example.test");
  });

  it("tolerates a missing code", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logDbError("x", { message: "boom" });
    expect(spy.mock.calls[0]!.map(String).join(" ")).toContain("boom");
  });
});
