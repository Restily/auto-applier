import { DEFAULT_LOCALE, type Locale } from "./config";

/**
 * Russian iff the highest-q language tag has primary subtag "ru"
 * (case-insensitive); everything else, including malformed input, is English.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  let bestTag: string | null = null;
  let bestQ = -1;
  for (const part of acceptLanguage.split(",")) {
    const [rawTag, ...params] = part.trim().split(";");
    const tag = rawTag?.trim().toLowerCase() ?? "";
    if (!/^[a-z]{1,8}(-[a-z0-9]{1,8})*$/.test(tag)) continue;
    let q = 1;
    for (const param of params) {
      const match = /^\s*q\s*=\s*([0-9.]+)\s*$/i.exec(param);
      if (match) q = Number.parseFloat(match[1]!);
    }
    if (Number.isNaN(q)) continue;
    if (q > bestQ) {
      bestQ = q;
      bestTag = tag;
    }
  }

  return bestTag !== null && bestTag.split("-")[0] === "ru" ? "ru" : DEFAULT_LOCALE;
}
