"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { getServerEnv } from "@/lib/env.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationKey } from "@/lib/validation/messages";

import { mapSignInError, mapSignUpError, type SignInFormError, type SignUpFormError } from "./errors";
import { resolveLandingPath } from "./landing";
import { isNewAccount } from "./oauth";
import { safeNextPath } from "./redirects";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema, toFieldErrors } from "./schemas";

export type AuthFormState =
  | { status: "idle" }
  | {
      status: "error";
      formError?: SignUpFormError | SignInFormError | "unknown";
      fieldErrors?: Partial<Record<"email" | "password", ValidationKey>>;
      email?: string;
    };

export type ForgotPasswordState = {
  status: "idle" | "sent" | "error";
  fieldErrors?: { email?: ValidationKey };
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function text(fd: FormData, name: string): string {
  const value = fd.get(name);
  return typeof value === "string" ? value : "";
}

async function copyProfileLocaleToCookie(userId: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("profiles").select("ui_locale").eq("id", userId).maybeSingle();
    if (isLocale(data?.ui_locale)) {
      (await cookies()).set(LOCALE_COOKIE, data.ui_locale, { maxAge: ONE_YEAR_SECONDS, path: "/", sameSite: "lax" });
    }
  } catch {
    // The cookie is a convenience; signing in must not fail because it could not be synced.
  }
}

export async function signUpAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const raw = { email: text(fd, "email"), password: text(fd, "password") };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), email: raw.email };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { locale: await getLocale() } },
  });
  if (error) return { status: "error", formError: mapSignUpError(error), email: parsed.data.email };
  // Sign-up needs no email confirmation, so a session always comes back; anything else is unexpected.
  if (!data.session) return { status: "error", formError: "unknown", email: parsed.data.email };

  redirect("/onboarding?welcome=1");
}

export async function signInAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const raw = { email: text(fd, "email"), password: text(fd, "password") };
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), email: raw.email };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { status: "error", formError: mapSignInError(error ?? {}), email: parsed.data.email };
  }

  await copyProfileLocaleToCookie(data.user.id);
  redirect(safeNextPath(text(fd, "next")) ?? (await resolveLandingPath()));
}

/** Always reports "sent" for a well-formed email: the response must not reveal whether an account exists. */
export async function requestPasswordResetAction(_prev: ForgotPasswordState, fd: FormData): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: text(fd, "email") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors<"email">(parsed.error) };
  }
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email);
  } catch {
    // Swallowed on purpose (no enumeration).
  }
  return { status: "sent" };
}

export async function updatePasswordAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({ password: text(fd, "password") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.status === 401 || error.code === "session_not_found" || error.code === "not_authenticated") {
      redirect("/reset-password?error=link_invalid");
    }
    if (error.code === "weak_password") return { status: "error", fieldErrors: { password: "minPassword" } };
    return { status: "error", formError: mapSignUpError(error) === "rate_limited" ? "rate_limited" : "unknown" };
  }

  await supabase.auth.signOut({ scope: "global" });
  redirect("/sign-in?notice=password_updated");
}

export async function startGoogleSignInAction(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getServerEnv().APP_ORIGIN}/auth/callback` },
  });
  if (error || !data.url) redirect("/sign-in?notice=oauth_failed");
  redirect(data.url);
}

export async function exchangeOAuthCodeAction(code: string): Promise<{ redirectTo: string }> {
  const failed = { redirectTo: "/sign-in?notice=oauth_failed" };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return failed;

    if (isNewAccount(data.user, new Date())) {
      // Google gives us no locale: keep the language the visitor was already using.
      await supabase.from("profiles").update({ ui_locale: await getLocale() }).eq("id", data.user.id);
      return { redirectTo: "/onboarding?welcome=1" };
    }
    await copyProfileLocaleToCookie(data.user.id);
    return { redirectTo: await resolveLandingPath() };
  } catch {
    return failed;
  }
}
