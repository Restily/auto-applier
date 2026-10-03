import { describe, expect, it } from "vitest";

import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema, toFieldErrors } from "./schemas";

function firstIssueMessage(result: { success: boolean; error?: { issues: { message: string }[] } }): string | undefined {
  return result.error?.issues[0]?.message;
}

describe("signUpSchema", () => {
  it("malformed email -> email", () => {
    const r = signUpSchema.safeParse({ email: "not-an-email", password: "longenough" });
    expect(r.success).toBe(false);
    expect(toFieldErrors(r.error!)).toEqual({ email: "email" });
  });

  it("empty -> required", () => {
    const r = signUpSchema.safeParse({ email: "", password: "" });
    expect(r.success).toBe(false);
    expect(toFieldErrors(r.error!)).toEqual({ email: "required", password: "required" });
  });

  it("7-char password -> minPassword", () => {
    const r = signUpSchema.safeParse({ email: "a@example.test", password: "1234567" });
    expect(r.success).toBe(false);
    expect(toFieldErrors(r.error!)).toEqual({ password: "minPassword" });
  });

  it("8-char password ok", () => {
    expect(signUpSchema.safeParse({ email: "a@example.test", password: "12345678" }).success).toBe(true);
  });

  it("email is trimmed", () => {
    const r = signUpSchema.safeParse({ email: "  a@example.test  ", password: "12345678" });
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("a@example.test");
  });

  it("does not trim the password", () => {
    const r = signUpSchema.safeParse({ email: "a@example.test", password: "  12345  " });
    expect(r.success).toBe(true);
    expect(r.data?.password).toBe("  12345  ");
  });
});

describe("signInSchema", () => {
  it("accepts a short existing password but not an empty one", () => {
    expect(signInSchema.safeParse({ email: "a@example.test", password: "x" }).success).toBe(true);
    const r = signInSchema.safeParse({ email: "a@example.test", password: "" });
    expect(toFieldErrors(r.error!)).toEqual({ password: "required" });
  });

  it("malformed email -> email", () => {
    expect(firstIssueMessage(signInSchema.safeParse({ email: "x", password: "y" }))).toBe("email");
  });
});

describe("forgotPasswordSchema / resetPasswordSchema", () => {
  it("forgot: requires a valid email", () => {
    expect(toFieldErrors(forgotPasswordSchema.safeParse({ email: "" }).error!)).toEqual({ email: "required" });
    expect(forgotPasswordSchema.safeParse({ email: "a@example.test" }).success).toBe(true);
  });

  it("reset: password >= 8", () => {
    expect(toFieldErrors(resetPasswordSchema.safeParse({ password: "short" }).error!)).toEqual({
      password: "minPassword",
    });
    expect(resetPasswordSchema.safeParse({ password: "long-enough" }).success).toBe(true);
  });
});
