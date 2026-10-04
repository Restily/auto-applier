import { describe, expect, it } from "vitest";

import { isRecoverySession, RECOVERY_MAX_AGE_SECONDS } from "./recovery";

const NOW_MS = 1_700_000_000_000;
const NOW_S = NOW_MS / 1000;
const at = (method: string, timestamp: number) => ({ method, timestamp });
/** amr newest first; the newest entry is "just now" and each earlier one a minute older. */
const amr = (...methods: string[]) => ({ amr: methods.map((method, i) => at(method, NOW_S - i * 60)) });
const check = (claims: Parameters<typeof isRecoverySession>[0]) => isRecoverySession(claims, NOW_MS);

describe("isRecoverySession (M1 review #10)", () => {
  it("is true for the session the emailed recovery link creates (GoTrue v2 records it as otp)", () => {
    expect(check(amr("otp"))).toBe(true);
  });

  it("is true when GoTrue labels it recovery (PKCE flow)", () => {
    expect(check(amr("recovery"))).toBe(true);
  });

  it("is false for an ordinary password session", () => {
    expect(check(amr("password"))).toBe(false);
  });

  it("is false for a Google sign-in", () => {
    expect(check(amr("oauth"))).toBe(false);
  });

  it("only the most recent method counts: a recovery link long ago followed by a password sign-in is not recovery", () => {
    expect(check(amr("password", "otp"))).toBe(false);
  });

  it("is false without claims or without amr", () => {
    expect(check(undefined)).toBe(false);
    expect(check(null)).toBe(false);
    expect(check({})).toBe(false);
    expect(check({ amr: [] })).toBe(false);
    expect(check({ amr: "otp" })).toBe(false);
  });

  it("the legacy string-array shape carries no timestamp, so freshness cannot be proven: not recovery", () => {
    expect(check({ amr: ["otp"] })).toBe(false);
    expect(check({ amr: ["password"] })).toBe(false);
  });
});

describe("isRecoverySession freshness (M1 review N3)", () => {
  it("the bound is 15 minutes", () => {
    expect(RECOVERY_MAX_AGE_SECONDS).toBe(15 * 60);
  });

  it.each(["otp", "recovery"])("a %s entry from 14 minutes ago is still recovery", (method) => {
    expect(check({ amr: [at(method, NOW_S - 14 * 60)] })).toBe(true);
  });

  it("exactly at the bound is still recovery", () => {
    expect(check({ amr: [at("otp", NOW_S - RECOVERY_MAX_AGE_SECONDS)] })).toBe(true);
  });

  it.each(["otp", "recovery"])("a %s entry older than 15 minutes is not recovery", (method) => {
    expect(check({ amr: [at(method, NOW_S - RECOVERY_MAX_AGE_SECONDS - 1)] })).toBe(false);
    expect(check({ amr: [at(method, NOW_S - 3 * 60 * 60)] })).toBe(false);
  });

  it("a missing, non-numeric or non-finite timestamp is not recovery", () => {
    expect(check({ amr: [{ method: "otp" }] })).toBe(false);
    expect(check({ amr: [{ method: "otp", timestamp: "now" }] })).toBe(false);
    expect(check({ amr: [{ method: "otp", timestamp: Number.NaN }] })).toBe(false);
  });

  it("a timestamp too far in the future is not trusted", () => {
    expect(check({ amr: [at("otp", NOW_S + 3600)] })).toBe(false);
  });

  it("defaults to the real clock", () => {
    const fresh = Math.floor(Date.now() / 1000);
    expect(isRecoverySession({ amr: [at("otp", fresh)] })).toBe(true);
    expect(isRecoverySession({ amr: [at("otp", fresh - RECOVERY_MAX_AGE_SECONDS - 60)] })).toBe(false);
  });
});
