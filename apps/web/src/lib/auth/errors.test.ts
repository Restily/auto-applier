import { describe, expect, it } from "vitest";

import { mapSignInError, mapSignUpError } from "./errors";

describe("mapSignUpError", () => {
  it.each(["user_already_exists", "email_exists"])("%s -> duplicate_email", (code) => {
    expect(mapSignUpError({ code, status: 422 })).toBe("duplicate_email");
  });

  it("weak_password -> weak_password", () => {
    expect(mapSignUpError({ code: "weak_password", status: 422 })).toBe("weak_password");
  });

  it("429 and rate-limit codes -> rate_limited", () => {
    expect(mapSignUpError({ status: 429 })).toBe("rate_limited");
    expect(mapSignUpError({ code: "over_request_rate_limit" })).toBe("rate_limited");
  });

  it("anything else -> unknown", () => {
    expect(mapSignUpError({ code: "unexpected_failure", status: 500 })).toBe("unknown");
    expect(mapSignUpError({})).toBe("unknown");
  });
});

describe("mapSignInError", () => {
  it.each(["invalid_credentials", "user_not_found", "email_not_confirmed"])("%s -> invalid_credentials", (code) => {
    expect(mapSignInError({ code, status: 400 })).toBe("invalid_credentials");
  });

  it("429 -> rate_limited", () => {
    expect(mapSignInError({ status: 429 })).toBe("rate_limited");
  });

  it("everything else -> invalid_credentials (no enumeration)", () => {
    expect(mapSignInError({ status: 500 })).toBe("invalid_credentials");
    expect(mapSignInError({})).toBe("invalid_credentials");
  });
});
