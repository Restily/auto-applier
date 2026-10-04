"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { isLocale, LOCALE_COOKIE, PENDING_LOCALE_COOKIE, type Locale } from "@/i18n/config";
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

function setLocaleCookie(store: Awaited<ReturnType<typeof cookies>>, locale: Locale): void {
  store.set(LOCALE_COOKIE, locale, { maxAge: ONE_YEAR_SECONDS, path: "/", sameSite: "lax" });
}

/**
 * After sign-in: a language deliberately chosen while signed out (pending cookie) becomes the stored preference
 * (profiles.ui_locale; a DB trigger mirrors it to the auth locale used by email templates). Without one, the
 * stored value wins; a locale negotiated from Accept-Language never overrides it (S-005 AC2, B-003).
 */
async function syncLocaleAfterSignIn(userId: string): Promise<void> {
  try {
    const store = await cookies();
    const supabase = await createSupabaseServerClient();
    const pending = store.get(PENDING_LOCALE_COOKIE)?.value;
    store.delete(PENDING_LOCALE_COOKIE);

    if (isLocale(pending)) {
      const { error } = await supabase.from("profiles").update({ ui_locale: pending }).eq("id", userId);
      if (!error) {
        setLocaleCookie(store, pending);
        return;
      }
    }

    const { data } = await supabase.from("profiles").select("ui_locale").eq("id", userId).maybeSingle();
    if (isLocale(data?.ui_locale)) setLocaleCookie(store, data.ui_locale);
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

  // The pending choice is already the sign-up locale (getLocale above); nothing left to adopt.
  (await cookies()).delete(PENDING_LOCALE_COOKIE);
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

  await syncLocaleAfterSignIn(data.user.id);
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
    // The recovery template reads the account locale; a language deliberately chosen since (even while signed out)
    // has to win, so it travels as a ?lang marker on redirectTo, which the template also receives (B-002).
    const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
    const options = isLocale(chosen)
      ? { redirectTo: `${getServerEnv().APP_ORIGIN}/reset-password?lang=${chosen}` }
      : undefined;
    await supabase.auth.resetPasswordForEmail(parsed.data.email, options);
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
    await syncLocaleAfterSignIn(data.user.id);
    return { redirectTo: await resolveLandingPath() };
  } catch {
    return failed;
  }
}
