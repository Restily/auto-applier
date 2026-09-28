import type account from "../../messages/en/account.json";
import type auth from "../../messages/en/auth.json";
import type common from "../../messages/en/common.json";
import type health from "../../messages/en/health.json";
import type legal from "../../messages/en/legal.json";
import type onboarding from "../../messages/en/onboarding.json";
import type profile from "../../messages/en/profile.json";
import type resume from "../../messages/en/resume.json";
import type settings from "../../messages/en/settings.json";
import type shell from "../../messages/en/shell.json";
import type validation from "../../messages/en/validation.json";
import type { Locale } from "./config";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: {
      common: typeof common;
      shell: typeof shell;
      validation: typeof validation;
      auth: typeof auth;
      onboarding: typeof onboarding;
      profile: typeof profile;
      resume: typeof resume;
      settings: typeof settings;
      account: typeof account;
      legal: typeof legal;
      health: typeof health;
    };
  }
}
