import enAccount from "../../messages/en/account.json";
import enAuth from "../../messages/en/auth.json";
import enCommon from "../../messages/en/common.json";
import enHealth from "../../messages/en/health.json";
import enLegal from "../../messages/en/legal.json";
import enOnboarding from "../../messages/en/onboarding.json";
import enProfile from "../../messages/en/profile.json";
import enResume from "../../messages/en/resume.json";
import enSettings from "../../messages/en/settings.json";
import enShell from "../../messages/en/shell.json";
import enValidation from "../../messages/en/validation.json";
import ruAccount from "../../messages/ru/account.json";
import ruAuth from "../../messages/ru/auth.json";
import ruCommon from "../../messages/ru/common.json";
import ruHealth from "../../messages/ru/health.json";
import ruLegal from "../../messages/ru/legal.json";
import ruOnboarding from "../../messages/ru/onboarding.json";
import ruProfile from "../../messages/ru/profile.json";
import ruResume from "../../messages/ru/resume.json";
import ruSettings from "../../messages/ru/settings.json";
import ruShell from "../../messages/ru/shell.json";
import ruValidation from "../../messages/ru/validation.json";
import type { Locale, Namespace } from "./config";

export type Messages = { [N in Namespace]: Record<string, unknown> };

const CATALOGS: Record<Locale, Messages> = {
  en: {
    common: enCommon,
    shell: enShell,
    validation: enValidation,
    auth: enAuth,
    onboarding: enOnboarding,
    profile: enProfile,
    resume: enResume,
    settings: enSettings,
    account: enAccount,
    legal: enLegal,
    health: enHealth,
  },
  ru: {
    common: ruCommon,
    shell: ruShell,
    validation: ruValidation,
    auth: ruAuth,
    onboarding: ruOnboarding,
    profile: ruProfile,
    resume: ruResume,
    settings: ruSettings,
    account: ruAccount,
    legal: ruLegal,
    health: ruHealth,
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Deep-merges `override` over `base`; keys missing from `override` keep the base value. */
export function mergeMessages<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];
    out[key] = isPlainObject(existing) && isPlainObject(value) ? mergeMessages(existing, value) : value;
  }
  return out as T;
}

/** Every namespace for `locale`, with English underneath so a missing key silently falls back to EN. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") return CATALOGS.en;
  return mergeMessages(CATALOGS.en, CATALOGS[locale]);
}
