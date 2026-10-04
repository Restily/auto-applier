import { describe, expect, it } from "vitest";

import { isRecoverySession } from "./recovery";

const amr = (...methods: string[]) => ({ amr: methods.map((method, i) => ({ method, timestamp: 1_700_000_000 - i })) });

describe("isRecoverySession (M1 review #10)", () => {
  it("is true for the session the emailed recovery link creates (GoTrue v2 records it as otp)", () => {
    expect(isRecoverySession(amr("otp"))).toBe(true);
  });

  it("is true when GoTrue labels it recovery (PKCE flow)", () => {
    expect(isRecoverySession(amr("recovery"))).toBe(true);
  });

  it("is false for an ordinary password session", () => {
    expect(isRecoverySession(amr("password"))).toBe(false);
  });

  it("is false for a Google sign-in", () => {
    expect(isRecoverySession(amr("oauth"))).toBe(false);
  });

  it("only the most recent method counts: a recovery link long ago followed by a password sign-in is not recovery", () => {
    expect(isRecoverySession(amr("password", "otp"))).toBe(false);
  });

  it("is false without claims or without amr", () => {
    expect(isRecoverySession(undefined)).toBe(false);
    expect(isRecoverySession(null)).toBe(false);
    expect(isRecoverySession({})).toBe(false);
    expect(isRecoverySession({ amr: [] })).toBe(false);
    expect(isRecoverySession({ amr: "otp" })).toBe(false);
  });

  it("tolerates the legacy string-array shape of amr", () => {
    expect(isRecoverySession({ amr: ["otp"] })).toBe(true);
    expect(isRecoverySession({ amr: ["password"] })).toBe(false);
  });
});
