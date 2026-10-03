import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string): never => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirectMock(url) }));

const cookieSet = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "ru" }));

const auth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
};
const profileSelect = vi.fn();
const profileUpdateEq = vi.fn();
const supabase = {
  auth,
  from: vi.fn(() => ({
    select: () => ({ eq: () => ({ maybeSingle: profileSelect }) }),
    update: () => ({ eq: profileUpdateEq }),
  })),
};
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => supabase }));

const resolveLandingPath = vi.fn();
vi.mock("@/lib/auth/landing", () => ({ resolveLandingPath: () => resolveLandingPath() }));
vi.mock("@/lib/env.server", () => ({
  getServerEnv: () => ({ APP_ORIGIN: "http://localhost:3000", API_URL: "http://127.0.0.1:8000" }),
}));

import {
  exchangeOAuthCodeAction,
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  startGoogleSignInAction,
  updatePasswordAction,
} from "./actions";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

async function redirectTarget(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (e) {
    const message = (e as Error).message;
    if (message.startsWith("NEXT_REDIRECT:")) return message.slice("NEXT_REDIRECT:".length);
    throw e;
  }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveLandingPath.mockResolvedValue("/onboarding");
  profileSelect.mockResolvedValue({ data: { ui_locale: "ru" } });
  profileUpdateEq.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

const idle = { status: "idle" } as const;

describe("signUpAction", () => {
  it("invalid input returns fieldErrors and never calls Supabase", async () => {
    const result = await signUpAction(idle, form({ email: "nope", password: "short" }));
    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { email: "email", password: "minPassword" },
      email: "nope",
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("duplicate returns duplicate_email without redirect", async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: { code: "user_already_exists", status: 422 } });
    const result = await signUpAction(idle, form({ email: "a@example.test", password: "12345678" }));
    expect(result).toEqual({ status: "error", formError: "duplicate_email", email: "a@example.test" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("success passes locale metadata and redirects to /onboarding?welcome=1", async () => {
    auth.signUp.mockResolvedValue({ data: { session: { access_token: "t" }, user: { id: "u1" } }, error: null });
    const target = await redirectTarget(signUpAction(idle, form({ email: " a@example.test ", password: "12345678" })));
    expect(target).toBe("/onboarding?welcome=1");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "a@example.test",
      password: "12345678",
      options: { data: { locale: "ru" } },
    });
  });

  it("a rate limit maps to rate_limited", async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: { status: 429, code: "over_request_rate_limit" } });
    const result = await signUpAction(idle, form({ email: "a@example.test", password: "12345678" }));
    expect(result).toMatchObject({ status: "error", formError: "rate_limited" });
  });
});

describe("signInAction", () => {
  const creds = { email: "a@example.test", password: "whatever" };

  it("wrong password and unknown email yield the same invalid_credentials", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { code: "invalid_credentials", status: 400 } });
    const wrongPassword = await signInAction(idle, form(creds));
    auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { code: "user_not_found", status: 400 } });
    const unknownEmail = await signInAction(idle, form(creds));
    expect(wrongPassword).toEqual(unknownEmail);
    expect(wrongPassword).toMatchObject({ status: "error", formError: "invalid_credentials" });
  });

  it("honours a safe next", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    expect(await redirectTarget(signInAction(idle, form({ ...creds, next: "/profile?tab=skills" })))).toBe(
      "/profile?tab=skills",
    );
  });

  it("ignores an unsafe next", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    for (const next of ["//evil.test", "https://evil.test", "/\\evil.test", "javascript:alert(1)"]) {
      expect(await redirectTarget(signInAction(idle, form({ ...creds, next })))).toBe("/onboarding");
    }
  });

  it("copies profile locale into the cookie", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    await redirectTarget(signInAction(idle, form(creds)));
    expect(cookieSet).toHaveBeenCalledWith("NEXT_LOCALE", "ru", expect.objectContaining({ path: "/" }));
  });

  it("empty fields return fieldErrors and never call Supabase", async () => {
    const result = await signInAction(idle, form({ email: "", password: "" }));
    expect(result).toMatchObject({ status: "error", fieldErrors: { email: "required", password: "required" } });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("requestPasswordResetAction", () => {
  const start = { status: "idle" } as const;

  it("reset request for unknown email reports sent", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: { code: "user_not_found", status: 400 } });
    expect(await requestPasswordResetAction(start, form({ email: "ghost@example.test" }))).toEqual({ status: "sent" });
  });

  it("swallows non-validation errors too (no enumeration)", async () => {
    auth.resetPasswordForEmail.mockRejectedValue(new Error("smtp down"));
    expect(await requestPasswordResetAction(start, form({ email: "a@example.test" }))).toEqual({ status: "sent" });
  });

  it("invalid email returns a field error and sends nothing", async () => {
    const result = await requestPasswordResetAction(start, form({ email: "nope" }));
    expect(result).toEqual({ status: "error", fieldErrors: { email: "email" } });
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("updatePasswordAction", () => {
  it("signs out globally and redirects with notice", async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    const target = await redirectTarget(updatePasswordAction(idle, form({ password: "brand-new-pass" })));
    expect(target).toBe("/sign-in?notice=password_updated");
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "brand-new-pass" });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "global" });
  });

  it("short password returns minPassword and never updates", async () => {
    const result = await updatePasswordAction(idle, form({ password: "short" }));
    expect(result).toMatchObject({ status: "error", fieldErrors: { password: "minPassword" } });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("a missing session sends the user to the expired-link panel", async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: { code: "session_not_found", status: 401 } });
    expect(await redirectTarget(updatePasswordAction(idle, form({ password: "brand-new-pass" })))).toBe(
      "/reset-password?error=link_invalid",
    );
  });
});

describe("startGoogleSignInAction", () => {
  it("redirects to the provider url with /auth/callback redirectTo", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.test/consent" }, error: null });
    const target = await redirectTarget(startGoogleSignInAction());
    expect(target).toBe("https://accounts.google.test/consent");
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback" },
    });
  });

  it("failure goes to oauth_failed", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: { message: "provider disabled" } });
    expect(await redirectTarget(startGoogleSignInAction())).toBe("/sign-in?notice=oauth_failed");
  });
});

describe("exchangeOAuthCodeAction", () => {
  it("new account adds welcome", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "u1", created_at: new Date().toISOString() } },
      error: null,
    });
    await expect(exchangeOAuthCodeAction("code-1")).resolves.toEqual({ redirectTo: "/onboarding?welcome=1" });
    expect(profileUpdateEq).toHaveBeenCalled();
  });

  it("existing account goes to its landing without welcome", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "u1", created_at: "2020-01-01T00:00:00Z" } },
      error: null,
    });
    resolveLandingPath.mockResolvedValue("/profile");
    await expect(exchangeOAuthCodeAction("code-1")).resolves.toEqual({ redirectTo: "/profile" });
    expect(cookieSet).toHaveBeenCalledWith("NEXT_LOCALE", "ru", expect.anything());
  });

  it("failure goes to oauth_failed", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: { message: "bad code" } });
    await expect(exchangeOAuthCodeAction("bad")).resolves.toEqual({ redirectTo: "/sign-in?notice=oauth_failed" });
  });
});
