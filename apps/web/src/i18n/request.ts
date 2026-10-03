import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { loadMessages } from "./messages";
import { negotiateLocale } from "./negotiate";

/** ADR-0015 order: signed-in profile -> NEXT_LOCALE cookie -> Accept-Language -> "en". */
async function resolveLocale(): Promise<Locale> {
  try {
    const user = await getSessionUser();
    if (user) {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.from("profiles").select("ui_locale").eq("id", user.id).maybeSingle();
      if (isLocale(data?.ui_locale)) return data.ui_locale;
    }
  } catch {
    // Fall through to the cookie / header: a broken session lookup must not break rendering.
  }

  const cookieValue = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieValue)) return cookieValue;

  return negotiateLocale((await headers()).get("accept-language"));
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: await loadMessages(locale),
    onError(error) {
      if (error.code === "MISSING_MESSAGE") {
        console.error(`MISSING_MESSAGE: ${error.message}`);
        return;
      }
      console.error(error);
    },
    // Never render a raw key (S-005 AC3).
    getMessageFallback: () => "",
  };
});
