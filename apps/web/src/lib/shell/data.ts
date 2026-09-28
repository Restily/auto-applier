import "server-only";

import { cache } from "react";
import { getLocale } from "next-intl/server";

import { isLocale, type Locale } from "@/i18n/config";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ShellData = {
  email: string;
  initials: string;
  balance: number;
  locale: Locale;
  onboardingComplete: boolean;
  /** D5: true iff the user's credit_ledger has a 'signup_grant' row. */
  signupBonusGranted: boolean;
};

function initialsOf(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const letters = parts.length >= 2 ? [parts[0]!, parts[1]!] : [parts[0] ?? "?"];
  return letters.map((p) => Array.from(p)[0]!.toUpperCase()).join("");
}

export const getShellData = cache(async (): Promise<ShellData> => {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const [balance, grant, profile, rawLocale] = await Promise.all([
    supabase.from("credit_balances").select("balance").eq("user_id", user.id).maybeSingle(),
    supabase.from("credit_ledger").select("id").eq("user_id", user.id).eq("reason", "signup_grant").limit(1),
    supabase.from("candidate_profiles").select("is_complete").eq("user_id", user.id).maybeSingle(),
    getLocale(),
  ]);

  return {
    email: user.email,
    initials: initialsOf(user.email),
    balance: balance.data?.balance ?? 0,
    locale: isLocale(rawLocale) ? rawLocale : "en",
    onboardingComplete: profile.data?.is_complete === true,
    signupBonusGranted: (grant.data?.length ?? 0) > 0,
  };
});
