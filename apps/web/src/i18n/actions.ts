"use server";

import { cookies } from "next/headers";

import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isLocale, LOCALE_COOKIE, PENDING_LOCALE_COOKIE, type Locale } from "./config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: Locale): Promise<{ persisted: boolean }> {
  if (!isLocale(locale)) {
    throw new Error(`Unsupported locale: ${String(locale)}`);
  }

  const store = await cookies();
  const options = { maxAge: ONE_YEAR_SECONDS, path: "/", sameSite: "lax" } as const;
  store.set(LOCALE_COOKIE, locale, options);

  const user = await getSessionUser();
  if (!user) {
    // Deliberate signed-out choice: kept until sign-in/up, where it becomes the stored preference (S-005 AC2).
    store.set(PENDING_LOCALE_COOKIE, locale, { ...options, httpOnly: true });
    return { persisted: true };
  }
  store.delete(PENDING_LOCALE_COOKIE);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ ui_locale: locale }).eq("id", user.id);
  return { persisted: error === null };
}
