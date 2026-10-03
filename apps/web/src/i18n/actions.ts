"use server";

import { cookies } from "next/headers";

import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isLocale, LOCALE_COOKIE, type Locale } from "./config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: Locale): Promise<{ persisted: boolean }> {
  if (!isLocale(locale)) {
    throw new Error(`Unsupported locale: ${String(locale)}`);
  }

  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
    sameSite: "lax",
  });

  const user = await getSessionUser();
  if (!user) return { persisted: true };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ ui_locale: locale }).eq("id", user.id);
  return { persisted: error === null };
}
