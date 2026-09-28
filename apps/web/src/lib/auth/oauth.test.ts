import { describe, expect, it } from "vitest";

import { callbackErrorRedirect, isNewAccount } from "./oauth";

describe("callbackErrorRedirect", () => {
  it("access_denied -> oauth_cancelled", () => {
    expect(callbackErrorRedirect("access_denied")).toBe("/sign-in?notice=oauth_cancelled");
  });

  it("server_error -> oauth_failed", () => {
    expect(callbackErrorRedirect("server_error")).toBe("/sign-in?notice=oauth_failed");
  });

  it("null -> null", () => {
    expect(callbackErrorRedirect(null)).toBeNull();
  });
});

describe("isNewAccount", () => {
  const now = new Date("2026-09-28T12:00:00.000Z");
  const at = (secondsAgo: number) => new Date(now.getTime() - secondsAgo * 1000).toISOString();

  it("true up to 120 seconds after creation", () => {
    expect(isNewAccount({ created_at: at(0) }, now)).toBe(true);
    expect(isNewAccount({ created_at: at(120) }, now)).toBe(true);
  });

  it("false after 120 seconds", () => {
    expect(isNewAccount({ created_at: at(121) }, now)).toBe(false);
    expect(isNewAccount({ created_at: at(86_400) }, now)).toBe(false);
  });

  it("false for an unparseable date", () => {
    expect(isNewAccount({ created_at: "nope" }, now)).toBe(false);
  });
});
