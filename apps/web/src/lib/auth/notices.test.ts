import { describe, expect, it } from "vitest";

import { parseSignInNotice } from "./notices";

describe("parseSignInNotice", () => {
  it.each(["oauth_cancelled", "oauth_failed", "password_updated", "session_expired"])("accepts %s", (value) => {
    expect(parseSignInNotice(value)).toBe(value);
  });

  it("rejects unknown and missing values", () => {
    expect(parseSignInNotice("<script>")).toBeUndefined();
    expect(parseSignInNotice(undefined)).toBeUndefined();
  });
});
