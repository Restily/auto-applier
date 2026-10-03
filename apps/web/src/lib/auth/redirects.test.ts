import { describe, expect, it } from "vitest";

import { decideProxyRedirect, safeNextPath } from "@/lib/auth/redirects";

describe("safeNextPath", () => {
  it.each([
    ["/profile", "/profile"],
    ["/profile?x=1", "/profile?x=1"],
    ["//evil.test", null],
    ["https://evil.test", null],
    ["/\\evil.test", null],
    ["javascript:alert(1)", null],
    ["", null],
    [null, null],
    [undefined, null],
    ["profile", null],
  ])("%j -> %j", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it("rejects paths longer than 512 characters", () => {
    expect(safeNextPath(`/${"a".repeat(512)}`)).toBeNull();
    expect(safeNextPath(`/${"a".repeat(511)}`)).not.toBeNull();
  });

  it("rejects control characters", () => {
    expect(safeNextPath("/profile\n//evil.test")).toBeNull();
  });
});

describe("decideProxyRedirect", () => {
  const base = { search: "", isSignedIn: false, hadAuthCookie: false };

  it("sends a signed-out visitor from a protected path to sign-in with next", () => {
    expect(decideProxyRedirect({ ...base, pathname: "/settings" })).toBe("/sign-in?next=%2Fsettings");
  });

  it("keeps the query string inside next", () => {
    expect(decideProxyRedirect({ ...base, pathname: "/profile", search: "?tab=1" })).toBe(
      "/sign-in?next=%2Fprofile%3Ftab%3D1",
    );
  });

  it("adds reason=session_expired when an auth cookie was present", () => {
    expect(decideProxyRedirect({ ...base, pathname: "/settings", hadAuthCookie: true })).toBe(
      "/sign-in?next=%2Fsettings&reason=session_expired",
    );
  });

  it("protects nested paths but not look-alike prefixes", () => {
    expect(decideProxyRedirect({ ...base, pathname: "/onboarding/resume" })).toContain("/sign-in?next=");
    expect(decideProxyRedirect({ ...base, pathname: "/settingsx" })).toBeNull();
  });

  it("sends a signed-in user away from sign-in and sign-up", () => {
    expect(decideProxyRedirect({ ...base, pathname: "/sign-in", isSignedIn: true })).toBe("/");
    expect(decideProxyRedirect({ ...base, pathname: "/sign-up", isSignedIn: true })).toBe("/");
  });

  it("leaves reset-password alone for a signed-in user", () => {
    expect(decideProxyRedirect({ ...base, pathname: "/reset-password", isSignedIn: true })).toBeNull();
  });

  it("leaves sign-up alone when signed out", () => {
    expect(decideProxyRedirect({ ...base, pathname: "/sign-up" })).toBeNull();
  });

  it("leaves protected paths alone when signed in", () => {
    expect(decideProxyRedirect({ ...base, pathname: "/profile", isSignedIn: true })).toBeNull();
  });
});
